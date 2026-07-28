# 📊 OSGB Fatura ve Cari Takip Otomasyonu

**GitHub Deposu:** [https://github.com/szgnemin1/osgbfatura](https://github.com/szgnemin1/osgbfatura)

OSGB (Ortak Sağlık ve Güvenlik Birimi) kurumları, İSG profesyonelleri ve revir otomasyonları için geliştirilmiş modern **Fatura Hazırlama, Cari Takip, İSG Çalışan Sayısı ve Sağlık Verileri Entegrasyon Sistemidir**.

---

## 🌟 Öne Çıkan Özellikler

- **⚡ Canlı Sağlık Verileri Entegrasyonu (Webhook API):** Dış sağlık yazılımında kesilen faturalar bu sisteme anında canlı mesaj ve bildirim olarak düşer.
- **🏢 Otomatik Cari ve Çalışan Sayısı Eşleştirme:** Excel dosyalarından veya sağlık otomasyonundan gelen verileri mevcut cari listenizle anında eşleştirir.
- **📝 Tek Tıkla İşlenen Veri Temizleme:** Faturaya aktarılan veya işlenen sağlık mesajları sistem tarafından otomatik filtrelenir ve tekrar gösterilmez.
- **📄 PDF & Excel Çıktısı:** Tek tıkla toplu e-Fatura taslakları, GİB uyumlu PDF faturaları ve detaylı Excel hesap cetvelleri üretir.
- **🤖 Akıllı Asistan (Gemini AI):** Hatalı faturaları, eşleşmeyen cariyeleri ve tutar sapmalarını otomatik analiz eder.

---

## 🚀 Kurulum Adımları (Installation Guide)

Sistemi kendi bilgisayarınızda veya sunucunuzda (VPS / Cloud Run / Docker) çalıştırmak için aşağıdaki adımları sırasıyla uygulayın.

### 📋 Ön Gereksinimler
- **Node.js** (v18.0.0 veya üzeri sürüm)
- **npm** (v9.0.0 veya üzeri) veya **yarn** / **pnpm**

---

### 1️⃣ Projeyi Klonlayın

```bash
git clone https://github.com/szgnemin1/osgbfatura.git
cd osgbfatura
```

### 2️⃣ Bağımlılıkları Yükleyin

```bash
npm install
```

### 3️⃣ Ortam Değişkenlerini (.env) Yapılandırın

Kök dizinde `.env.example` dosyasını kopyalayarak `.env` adında yeni bir dosya oluşturun:

```bash
cp .env.example .env
```

`.env` dosyasını açıp gerekli bilgileri düzenleyin:

```env
# VPS / Webhook Güvenlik Anahtarı (Sağlık Otomasyonu Entegrasyonu İçin)
VPS_API_SECRET="vps_secure_secret_2026"

# Uygulama Alan Adı / URL
APP_URL="http://localhost:3000"

# Gemini AI API Anahtarı (İsteğe Bağlı)
GEMINI_API_KEY="your_gemini_api_key_here"
```

---

### 4️⃣ Geliştirici Modunda (Development) Çalıştırın

```bash
npm run dev
```

Uygulama çalıştıktan sonra tarayıcınızda şu adrese gidin:
👉 **`http://localhost:3000`**

---

### 5️⃣ Üretim (Production) Derlemesi ve Başlatma

Sunucuda canlıya almak için aşağıdaki komutları kullanın:

```bash
# Projeyi derleyin (Vite + esbuild)
npm run build

# Derlenmiş uygulamayı başlatın
npm start
```

---

## 🔌 Sağlık Otomasyonu Entegrasyonu (Webhook / API)

Harici sağlık yazılımınızdan veya otomasyonunuzdan fatura kesildiğinde bu sisteme canlı mesaj göndermek oldukça kolaydır.

- **Endpoint:** `POST /api/health-sync`
- **Header:** `Content-Type: application/json`
- **Header:** `Authorization: Bearer <VPS_API_SECRET>`

### 📩 Gönderilecek Örnek İstek (JSON Body)

```json
{
  "records": [
    {
      "firmName": "ABC Teknoloji A.Ş.",
      "paymentType": "fatura",
      "amount": 2500.00
    }
  ]
}
```

### 💻 cURL İle Örnek İstek

```bash
curl -X POST "http://localhost:3000/api/health-sync" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer vps_secure_secret_2026" \
     -d '{
       "records": [
         { "firmName": "Kaya Lojistik Ltd.", "paymentType": "fatura", "amount": 1850.00 }
       ]
     }'
```

---

## 🛠️ Kullanılan Teknolojiler (Tech Stack)

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion (Framer Motion)
- **Backend:** Node.js, Express.js, TSX, esbuild
- **Raporlama:** jsPDF, jsPDF-AutoTable, XLSX (SheetJS)
- **Build Tool:** Vite 6

---

## 📜 Lisans

Bu proje **MIT Lisansı** altında sunulmaktadır.
