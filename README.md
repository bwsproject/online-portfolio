# BERLY — 3D Interactive Portfolio
## Premium Digital Book Experience • Firebase + Modern Web

A luxury 3D digital interactive book portfolio web application featuring realistic dual-page flipping, smartphone touch gesture swipe, mouse drag physics, Table of Contents, Fullscreen, and a complete Firestore + Firebase Storage CMS with Admin Dashboard.

---

### 1. Membuat Firebase Project
1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Klik **"Add project"** atau **"Tambah project"**.
3. Beri nama project, misalnya `berly-portfolio-3d`.
4. Pilih opsi Google Analytics (opsional) lalu klik **"Create project"**.

---

### 2. Mengaktifkan Authentication
1. Pada menu navigasi kiri Firebase Console, klik **Build > Authentication**.
2. Klik tombol **Get Started**.
3. Pada tab **Sign-in method**, pilih **Email/Password**:
   - Aktifkan toggle **Email/Password**.
   - Klik **Save**.
4. (Opsional) Buka tab **Users** dan buat akun admin pertama:
   - Email: `berlyws7296@gmail.com`
   - Password: buat password yang aman.

---

### 3. Membuat Cloud Firestore Database
1. Pada menu kiri, klik **Build > Firestore Database**.
2. Klik **Create database**.
3. Pilih lokasi database terdekat (misal: `asia-southeast1` untuk Jakarta / Singapura atau `asia-southeast2`).
4. Pada pilihan Security rules, pilih **Start in test mode** sementara (kita akan mendeply `firestore.rules` hardened nanti).
5. Klik **Create**.

---

### 4. Membuat Firebase Storage
1. Pada menu kiri, klik **Build > Storage**.
2. Klik **Get Started**.
3. Pilih lokasi default (sesuai lokasi Firestore).
4. Klik **Done**.

---

### 5. Konfigurasi Web App & Menyimpan Config
1. Pada halaman **Project Overview** (icon roda gigi / Project Settings), klik icon **Web (</>)** untuk mendaftarkan web app.
2. Beri nama App Nickname: `Berly 3D Portfolio`.
3. Centang opsi **"Also set up Firebase Hosting for this app"**.
4. Salin objek `firebaseConfig` yang muncul.
5. Anda dapat memasukkan nilai config ke file `.env` atau langsung ke UI Admin Dashboard (tersedia fitur Firebase Config modal):
   ```env
   VITE_FIREBASE_API_KEY="AIzaSy..."
   VITE_FIREBASE_AUTH_DOMAIN="berly-portfolio-3d.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="berly-portfolio-3d"
   VITE_FIREBASE_STORAGE_BUCKET="berly-portfolio-3d.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="..."
   VITE_FIREBASE_APP_ID="1:...:web:..."
   ```
   *Catatan: Aplikasi ini dirancang cerdas dengan mode dual — jika Firebase belum dikonfigurasi, aplikasi berjalan lancar dengan demo data terintegrasi dan local storage sehingga tidak akan blank.*

---

### 6. Install Firebase CLI & Login
Jalankan di terminal komputer Anda:
```bash
npm install -g firebase-tools
firebase login
firebase use --add
# Pilih project yang sudah Anda buat di langkah 1
```

---

### 7. Build & Deploy ke Firebase Hosting
Jalankan perintah build lalu deploy:
```bash
# Build production bundle
npm run build

# Deploy Hosting, Firestore Rules, dan Storage Rules sekaligus:
firebase deploy
```

Atau deploy secara terpisah:
```bash
# Deploy Firestore rules saja:
firebase deploy --only firestore:rules

# Deploy Storage rules saja:
firebase deploy --only storage

# Deploy Hosting saja:
firebase deploy --only hosting
```

---

### 8. Fitur & Navigasi Portfolio
- **3D Book Cover**: Buka cover buku dengan tombol `[ OPEN PORTFOLIO ]`.
- **Realistic Page-Turn**: Membalik halaman dengan animasi 3D preserve-3d, rotateY, dynamic lighting & ambient shadow.
- **Desktop Mode**: Tampilan dual-page spread (kiri dan kanan).
- **Mobile Mode**: Tampilan single-page responsif dengan gestur sentuh (touch swipe left/right).
- **Mouse Drag**: Geser sudut/tepi halaman dengan pointer mouse untuk membalik halaman secara alami.
- **Keyboard Navigation**: Tombol panah kiri (Previous) dan panah kanan (Next).
- **Table of Contents**: Modal daftar isi untuk langsung melompat ke halaman mana saja.
- **Fullscreen Mode**: Memaksimalkan pengalaman visual buku digital.
- **Contact Form**: Formulir kontak yang langsung menyimpan pesan ke Firestore `messages` collection.
- **Admin Dashboard**: Akses admin untuk mengelola Halaman (Pages), Proyek (Projects), Layanan (Services), dan Pesan (Messages).
