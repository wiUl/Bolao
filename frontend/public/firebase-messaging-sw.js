/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDJUWToxwiUvdDB0uoF-ms58hqfWzKXRDM",
  authDomain: "futbolao-push.firebaseapp.com",
  projectId: "futbolao-push",
  messagingSenderId: "707405478704",
  appId: "1:707405478704:web:aaf36c6bd45e0848dc26f5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("=== PUSH RECEBIDO NO SW ===");
  console.log("payload:", payload);
  console.log("payload.notification:", payload?.notification);
  console.log("payload.data:", payload?.data);

  const title = payload?.data?.title || "Bolão";
  const options = {
    body: payload?.data?.body || "",
    icon: "/favicon.ico",
    data: payload?.data || {},
  };

  self.registration.showNotification(title, options);
});
