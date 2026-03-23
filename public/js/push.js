async function initPush() {
    const registration = await navigator.serviceWorker.register('/sw.js');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        alert('يجب السماح بالإشعارات');
        return;
    }

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // applicationServerKey: process.env.publicKey
        applicationServerKey: 'BDZu8tVAAU5Cf3QoaVRZ-qdJUotu8IngBwZvp4XZZssMXeGHQviLHnsBt2UTUkxvwis1TEsfbwEj8hWOlT4MIn4'
    });

    await fetch('/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: { 'Content-Type': 'application/json' }
    });

    console.log("✅ تم تفعيل الإشعارات");
}