# 📊 OSGB Fatura ve Cari Takip Otomasyonu

**GitHub Deposu:** [https://github.com/szgnemin1/osgbfatura](https://github.com/szgnemin1/osgbfatura)

OSGB (Ortak Sağlık ve Güvenlik Birimi) kurumları, İSG profesyonelleri ve revir otomasyonları için geliştirilmiş modern **Fatura Hazırlama, Cari Takip, İSG Çalışan Sayısı ve Sağlık Verileri Entegrasyon Sistemidir**.

---

## 🌐 Sistem Port Yapılandırması (Port Configuration)

| Sistem Adı | Çalıştığı Port | Açıklama |
| :--- | :--- | :--- |
| **OSGB Fatura Otomasyonu (Bu Proje)** | **`3002`** | Fatura hazırlama, cari hesap, e-Fatura PDF/Excel ve canlı bildirim paneli |
| **Tetkik & Lab Otomasyonu (Diğer Sistem)** | **`3001`** | Tetkik girilen, tahlil ve reçete/fatura oluşturulan dış sağlık sistemi |

> ℹ️ **Not:** Tetkik sisteminde (Port 3001) bir fatura veya sağlık hizmeti kesildiğinde, otomatik olarak Port 3002'de çalışan bu sisteme anlık POST bildirimi gönderilir.

---

## 🚀 Detaylı Kurulum Adımları (Installation Guide)

Sistemi kendi bilgisayarınızda veya sunucunuzda (VPS / Ubuntu / Windows Server / Docker) sorunsuz çalıştırmak için aşağıdaki adımları uygulayın.

### 📋 Ön Gereksinimler
- **Node.js** (v18.0.0 veya üzeri sürüm)
- **npm** (v9.0.0 veya üzeri)

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

### 3️⃣ Ortam Değişkenlerini (.env) Oluşturun
Kök dizindeki `.env.example` dosyasını kopyalayıp `.env` adında yeni bir dosya oluşturun:

```bash
cp .env.example .env
```

`.env` dosya içeriği aşağıdaki şekilde ayarlanmalıdır (**Port 3002**):

```env
# Uygulama Portu (Port 3002 olarak ayarlandı)
PORT=3002

# Fatura Uygulaması URL Adresi
APP_URL="http://localhost:3002"

# Tetkik Sisteminden (Port 3001) Gelen İstekler İçin Güvenlik Anahtarı
VPS_API_SECRET="vps_secure_secret_2026"

# Yapay Zeka Desteği İçin Gemini API Anahtarı (İsteğe Bağlı)
GEMINI_API_KEY="your_gemini_api_key_here"
```

---

### 4️⃣ Geliştirici Modunda (Development) Çalıştırma

```bash
npm run dev
```

Uygulama başladığında tarayıcınızdan şu adrese erişebilirsiniz:
👉 **`http://localhost:3002`**

---

### 5️⃣ Üretim (Production) Derlemesi ve Başlatma

Sunucunuzda uygulamayı canlıya almak için:

```bash
# Projeyi derleyin
npm run build

# Derlenmiş uygulamayı 3002 portunda başlatın
npm start
```

#### ⚙️ PM2 İle 7/24 Arka Planda Yönetim (PM2 Process Manager)
Sunucu yeniden başlasa bile uygulamanın 3002 portunda arka planda kesintisiz çalışması için `PM2` kullanımı önerilir:

```bash
# 1. PM2'yi global olarak yükleyin (daha önce yüklemediyseniz)
npm install -g pm2

# 2. Uygulamayı 3002 portunda PM2 ile başlatın
pm2 start dist/server.cjs --name "osgb-fatura-3002"

# 3. Sunucu yeniden başladığında uygulamanın otomatik açılmasını sağlayın
pm2 save
pm2 startup
```

##### 🛠️ Sık Kullanılan PM2 Komutları:
```bash
# Durum kontrolü (Uygulama çalışıyor mu?)
pm2 status

# Canlı log/hata izleme
pm2 logs osgb-fatura-3002

# Yeniden başlatma
pm2 restart osgb-fatura-3002

# Durdurma
pm2 stop osgb-fatura-3002

# PM2 listesinden silme
pm2 delete osgb-fatura-3002
```

---

## 🔄 Projeyi Güncelleme Yöntemleri (Updating the App)

Sistemi güncellemek için **2 farklı yöntem** kullanabilirsiniz:

### 🌟 Yöntem 1: Web Arayüzünden Tek Tıkla Güncelleme (Terminale Girmeden!)
1. Uygulamada sol menüdeki **"Güncelle"** veya **"Ayarlar"** butonuna tıklayın.
2. **"Güncellemeleri Kontrol Et"** butonuna basarak GitHub'daki yeni güncellemeleri görün.
3. **"Sistemi Şimdi Güncelle"** butonuna tıklayın.
4. Sistem otomatik olarak `git pull`, `npm run build` ve `pm2 restart osgb-fatura-3002` işlemlerini arka planda tamamlayacak ve sayfayı yenileyecektir.

---

### 💻 Yöntem 2: Terminal Üzerinden Manuel Güncelleme

GitHub deposuna yeni kodlar geldiğinde sunucu terminalinden güncellemek isterseniz:

```bash
# 1. Proje dizinine gidin
cd osgbfatura

# 2. GitHub'dan en son güncellemeleri çekin
git pull origin main

# 3. Bağımlılıkları kontrol edin ve uygulamayı derleyin
npm install
npm run build

# 4. PM2 sürecini yeniden başlatın
pm2 restart osgb-fatura-3002
```

---

## 🔌 Tetkik Sisteminden (Port 3001) Fatura Sistemine (Port 3002) Veri Gönderme

Tetkik / Sağlık otomasyonunuzda (Port 3001) bir fatura kesildiğinde aşağıdaki bilgilerle Port 3002'deki Fatura Otomasyonuna bir POST isteği gönderin:

- **Hedef URL:** `http://localhost:3002/api/health-sync` (veya `http://<SUNUCU_IP>:3002/api/health-sync`)
- **Method:** `POST`
- **Header:** `Content-Type: application/json`
- **Header:** `Authorization: Bearer vps_secure_secret_2026`

### 📩 Gönderilecek Örnek JSON Body
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

### 💻 Tetkik Sisteminden (Port 3001) Tetikleme Kod Örnekleri

#### 1. cURL İle
```bash
curl -X POST "http://localhost:3002/api/health-sync" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer vps_secure_secret_2026" \
     -d '{
       "records": [
         { "firmName": "Kaya Lojistik Ltd.", "paymentType": "fatura", "amount": 1850.00 }
       ]
     }'
```

#### 2. Node.js / JavaScript İle
```javascript
const response = await fetch('http://localhost:3002/api/health-sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer vps_secure_secret_2026'
  },
  body: JSON.stringify({
    records: [
      { firmName: 'Kaya Lojistik Ltd.', paymentType: 'fatura', amount: 1850.00 }
    ]
  })
});
const result = await response.json();
console.log(result);
```

#### 3. Python İle
```python
import requests

url = "http://localhost:3002/api/health-sync"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer vps_secure_secret_2026"
}
data = {
    "records": [
        {"firmName": "Kaya Lojistik Ltd.", "paymentType": "fatura", "amount": 1850.00}
    ]
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

---

## 🤖 Tetkik & Lab Sistemini (Port 3001) Geliştiren AI İçin Kopyalanabilir Prompt

Tetkik / Sağlık Otomasyonu projenizi geliştiren diğer Yapay Zekaya (AI) aşağıdaki metni **birebir kopyalayıp yapıştırarak** talimat verebilirsiniz:

```text
Sistemimizde aynı sunucu üzerinde çalışan iki ana otomasyon bulunmaktadır:
1. Tetkik & Lab Otomasyonu (Port 3001 - Sen bu sistemi geliştiriyorsun)
2. OSGB Fatura & Cari Otomasyonu (Port 3002 - Webhook alıcı sistem)

[GÖREV VE ZORUNLULUKLAR]
Tetkik Sisteminde (Port 3001) herhangi bir tetkik, tahlil, reçete, fatura veya sağlık hizmeti işlemi kaydedildiğinde/kesildiğinde, Port 3002'deki Fatura Otomasyonuna ANINDA ve CANLI olarak HTTP POST isteği atacaksın.

[ENTEGRASYON DETAYLARI]
- Hedef Endpoint: http://localhost:3002/api/health-sync
- HTTP Metodu: POST
- Header Bilgileri:
  - Content-Type: application/json
  - Authorization: Bearer vps_secure_secret_2026 (veya x-api-key: vps_secure_secret_2026)

[JSON PAYLOAD FORMATI]
Gönderilecek veri formatı şu şekilde olmalıdır:
{
  "records": [
    {
      "firmName": "FİRMA VEYA MÜŞTERİ ADI",
      "paymentType": "fatura",
      "amount": 1500.00
    }
  ]
}

[ESNEK ALAN EŞLEŞTİRMELERİ]
Port 3002 alıcı servisi aşağıdaki alternatif key isimlerini de otomatik kabul eder:
- Firma Adı için: firmName, firma, firm, company, musteri, hasta, kurum, title, isyeri, name, cariName, hastaAdi, kurumAdi
- Tutar için: amount, tutar, toplam, fiyat, ucret, price, cost, val, toplamTutar, bakiye
- Ödeme/İşlem Türü için: paymentType, odemeTuru, type, tur, islem

[KRİTİK KURALLAR]
1. Her yeni tetkik/sağlık kaydında bu API'ye isteği anında asenkron (try-catch içinde) gönder.
2. Port 3002 servisinin yanıt verememesi durumunda Tetkik Sisteminin kendi ana akışı aksamamalı (catch bloğunda logla, hata fırlatma).
3. İstekleri http://localhost:3002/api/health-sync adresine gönder.
```

---

## ⚡ Özellik Özeti

1. **İşlenen Verilerin Otomatik Temizlenmesi:** Faturaya aktarılan sağlık mesajları canlı listeden temizlenir ve tekrar gösterilmez.
2. **Akıllı Cari Eşleştirme:** Kayıtlı olmayan firmalar için anında eşleştirme pencereleri açılır.
3. **GİB e-Fatura & PDF Çıktıları:** Tek tıkla toplu e-Fatura taslakları ve Excel hesap cetvelleri üretilir.

---

## 📜 Lisans
MIT License.
