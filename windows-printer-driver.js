const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function sendRawToPrinter(printerName, data) {
    return new Promise((resolve, reject) => {

        // تحويل البيانات إلى Buffer
        const buffer = Buffer.isBuffer(data)
            ? data
            : Buffer.from(data);

        // ملف مؤقت للبيانات الخام
        const tempFile = path.join(
            os.tmpdir(),
            `xp80_raw_${process.pid}_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2)}.bin`
        );

        try {
            // مهم جدًا:
            // لا نضع بيانات الطباعة داخل Command Line
            // بل نحفظها في ملف مؤقت
            fs.writeFileSync(tempFile, buffer);
        } catch (error) {
            reject(error);
            return;
        }

        const psCode = `
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class RawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public class DOCINFO
    {
        [MarshalAs(UnmanagedType.LPWStr)]
        public string pDocName;

        [MarshalAs(UnmanagedType.LPWStr)]
        public string pOutputFile;

        [MarshalAs(UnmanagedType.LPWStr)]
        public string pDataType;
    }

    [DllImport("winspool.drv",
        EntryPoint="OpenPrinterW",
        SetLastError=true,
        CharSet=CharSet.Unicode)]
    public static extern bool OpenPrinter(
        string pPrinterName,
        out IntPtr phPrinter,
        IntPtr pDefault);

    [DllImport("winspool.drv",
        SetLastError=true)]
    public static extern bool ClosePrinter(
        IntPtr hPrinter);

    [DllImport("winspool.drv",
        EntryPoint="StartDocPrinterW",
        SetLastError=true,
        CharSet=CharSet.Unicode)]
    public static extern int StartDocPrinter(
        IntPtr hPrinter,
        int level,
        DOCINFO pDocInfo);

    [DllImport("winspool.drv",
        SetLastError=true)]
    public static extern bool EndDocPrinter(
        IntPtr hPrinter);

    [DllImport("winspool.drv",
        SetLastError=true)]
    public static extern bool StartPagePrinter(
        IntPtr hPrinter);

    [DllImport("winspool.drv",
        SetLastError=true)]
    public static extern bool EndPagePrinter(
        IntPtr hPrinter);

    [DllImport("winspool.drv",
        SetLastError=true)]
    public static extern bool WritePrinter(
        IntPtr hPrinter,
        IntPtr pBytes,
        int dwCount,
        out int dwWritten);

    public static void Print(
        string printerName,
        byte[] data)
    {
        IntPtr hPrinter;

        if (!OpenPrinter(
            printerName,
            out hPrinter,
            IntPtr.Zero))
        {
            throw new Exception(
                "OpenPrinter failed. Error: " +
                Marshal.GetLastWin32Error());
        }

        try
        {
            DOCINFO docInfo = new DOCINFO();

            docInfo.pDocName = "XP-80 RAW Print";
            docInfo.pOutputFile = null;
            docInfo.pDataType = "RAW";

            if (StartDocPrinter(
                hPrinter,
                1,
                docInfo) == 0)
            {
                throw new Exception(
                    "StartDocPrinter failed. Error: " +
                    Marshal.GetLastWin32Error());
            }

            try
            {
                if (!StartPagePrinter(hPrinter))
                {
                    throw new Exception(
                        "StartPagePrinter failed. Error: " +
                        Marshal.GetLastWin32Error());
                }

                try
                {
                    IntPtr ptr =
                        Marshal.AllocHGlobal(data.Length);

                    try
                    {
                        Marshal.Copy(
                            data,
                            0,
                            ptr,
                            data.Length);

                        int written;

                        if (!WritePrinter(
                            hPrinter,
                            ptr,
                            data.Length,
                            out written))
                        {
                            throw new Exception(
                                "WritePrinter failed. Error: " +
                                Marshal.GetLastWin32Error());
                        }

                        if (written != data.Length)
                        {
                            throw new Exception(
                                "Only " +
                                written +
                                " of " +
                                data.Length +
                                " bytes were written.");
                        }
                    }
                    finally
                    {
                        Marshal.FreeHGlobal(ptr);
                    }
                }
                finally
                {
                    EndPagePrinter(hPrinter);
                }
            }
            finally
            {
                EndDocPrinter(hPrinter);
            }
        }
        finally
        {
            ClosePrinter(hPrinter);
        }
    }
}
"@

$filePath = $env:RAW_PRINT_FILE
$printerName = $env:RAW_PRINTER_NAME

if (-not $filePath) {
    throw "RAW_PRINT_FILE is missing."
}

if (-not $printerName) {
    throw "RAW_PRINTER_NAME is missing."
}

if (-not (Test-Path -LiteralPath $filePath)) {
    throw "Print file not found: $filePath"
}

$data = [System.IO.File]::ReadAllBytes($filePath)

[RawPrinter]::Print(
    $printerName,
    $data
)
`;

        const env = {
            ...process.env,
            RAW_PRINT_FILE: tempFile,
            RAW_PRINTER_NAME: printerName
        };

        execFile(
            'powershell.exe',
            [
                '-NoProfile',
                '-NonInteractive',
                '-ExecutionPolicy',
                'Bypass',
                '-Command',
                psCode
            ],
            {
                windowsHide: true,
                maxBuffer: 1024 * 1024,
                env
            },
            (error, stdout, stderr) => {

                // حذف الملف المؤقت دائمًا
                try {
                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile);
                    }
                } catch (cleanupError) {
                    console.error(
                        'تحذير: فشل حذف الملف المؤقت:',
                        cleanupError.message
                    );
                }

                if (error) {
                    reject(
                        new Error(
                            stderr?.trim() ||
                            stdout?.trim() ||
                            error.message
                        )
                    );
                    return;
                }

                resolve(stdout);
            }
        );
    });
}


module.exports = {

    getPrinters() {
        return [
            {
                name: 'XP-80',
                attributes: ['RAW-ONLY']
            },
            {
                name: 'XP-80-lan',
                attributes: ['RAW-ONLY']
            }
        ];
    },

    getPrinter(name) {
        return {
            name,
            status: 'READY'
        };
    },

    async printDirect(options) {

        if (!options || !options.data) {
            throw new Error('No print data supplied.');
        }

        const printerName =
            options.printer || 'XP-80';

        await sendRawToPrinter(
            printerName,
            options.data
        );

        if (typeof options.success === 'function') {
            options.success(Date.now());
        }

        return true;
    }
};