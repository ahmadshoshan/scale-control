const { execFileSync } = require('child_process');

const printerName = 'XP-80';

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

    [DllImport("winspool.drv", EntryPoint="OpenPrinterW",
        SetLastError=true, CharSet=CharSet.Unicode)]
    public static extern bool OpenPrinter(
        string pPrinterName,
        out IntPtr phPrinter,
        IntPtr pDefault);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint="StartDocPrinterW",
        SetLastError=true, CharSet=CharSet.Unicode)]
    public static extern int StartDocPrinter(
        IntPtr hPrinter,
        int level,
        DOCINFO pDocInfo);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool WritePrinter(
        IntPtr hPrinter,
        IntPtr pBytes,
        int dwCount,
        out int dwWritten);

    public static void Print(string printerName, byte[] data)
    {
        IntPtr hPrinter;

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
            throw new Exception("OpenPrinter failed. Error: " + Marshal.GetLastWin32Error());

        try
        {
            DOCINFO docInfo = new DOCINFO();
            docInfo.pDocName = "XP-80 RAW TEST";
            docInfo.pDataType = "RAW";

            if (StartDocPrinter(hPrinter, 1, docInfo) == 0)
                throw new Exception("StartDocPrinter failed. Error: " + Marshal.GetLastWin32Error());

            try
            {
                if (!StartPagePrinter(hPrinter))
                    throw new Exception("StartPagePrinter failed. Error: " + Marshal.GetLastWin32Error());

                try
                {
                    IntPtr unmanagedPointer = Marshal.AllocHGlobal(data.Length);

                    try
                    {
                        Marshal.Copy(data, 0, unmanagedPointer, data.Length);

                        int written;

                        if (!WritePrinter(
                            hPrinter,
                            unmanagedPointer,
                            data.Length,
                            out written))
                        {
                            throw new Exception(
                                "WritePrinter failed. Error: " +
                                Marshal.GetLastWin32Error());
                        }
                    }
                    finally
                    {
                        Marshal.FreeHGlobal(unmanagedPointer);
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

$base64 = "BASE64_DATA"
$data = [Convert]::FromBase64String($base64)

[RawPrinter]::Print("XP-80", $data)
`;

const data = Buffer.from(
    [
        '\x1B\x40',
        '\x1B\x61\x01',
        'XP-80 TEST',
        '\x0A',
        'Windows RAW Print',
        '\x0A',
        '\x0A',
        '\x1D\x56\x00'
    ].join(''),
    'latin1'
);

const base64 = data.toString('base64');

const finalPs = psCode.replace('BASE64_DATA', base64);

try {
    execFileSync(
        'powershell.exe',
        [
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            finalPs
        ],
        {
            stdio: 'inherit'
        }
    );

    console.log('✅ تم إرسال الاختبار إلى XP-80');
} catch (error) {
    console.error('❌ فشل إرسال الاختبار');
    console.error(error.message);
}