// تحقق من تسجيل الدخول
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
        window.location.href = '/index.html';
    } else {
        document.getElementById('loginError').classList.remove('d-none');
    }
});

// إرسال أمر إلى الخادم
function sendCommand(command) {
    fetch(`/send-command?command=${command}`)
        .then(response => response.text())
        .then(data => {
            console.log(data);
        })
        .catch(error => {
            console.error('حدث خطأ:', error);
        });
}