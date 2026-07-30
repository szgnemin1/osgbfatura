# Tehlike Sınıfına Göre Şube/Sicil Ayrımı İmplementasyon Planı

Firma kayıtlarında ve fatura hazırlık süreçlerinde (Excel yükleme) firmaların sicillerini tehlike sınıflarına göre (Az Tehlikeli, Tehlikeli, Çok Tehlikeli) ayırmak için yapılacak geliştirmeler aşağıdadır.

## Önerilen Değişiklikler

### 1. Veritabanı ve Tip Tanımlamaları (`server.ts` & `src/types.ts`)
Firma veri yapısına tehlike sınıfları için 3 ayrı çalışan sayısı alanı eklenecektir:
- `employeeCount_AzTehlikeli`: number
- `employeeCount_Tehlikeli`: number
- `employeeCount_CokTehlikeli`: number

*Not: Toplam çalışan sayısı (`employeeCount`) bu üç alanın toplamı olarak hesaplanacaktır.*

### 2. Firma Kayıt ve Düzenleme Ekranı (`src/components/PricingView.tsx`)
Firma ekleme veya düzenleme formunda sadece tek bir "Çalışan Sayısı" girmek yerine:
- **Az Tehlikeli Çalışan Sayısı**
- **Tehlikeli Çalışan Sayısı**
- **Çok Tehlikeli Çalışan Sayısı**
şeklinde üç farklı giriş alanı (input) sunulacaktır.

### 3. Fatura Hazırlık / Excel Ayrıştırma (`src/components/InvoicePrepView.tsx`)
Excel dosyası yüklendiğinde:
1. `Hizmet Alan İşyeri Tehlike Sınıfı` başlığı da okunacaktır.
2. Excel'deki satırda belirtilen tehlike sınıfına göre, eşleşen firmanın ilgili tehlike sınıfı çalışan sayısı ile karşılaştırma/güncelleme yapılacaktır.
3. Aynı firmanın farklı tehlike sınıflarındaki sicil satırları ayrı ayrı algılanıp, tek bir faturada birleştirilecek veya firma toplamı olarak yansıtılacaktır.

---

> [!WARNING]
> **Kullanıcı Onayı ve Geri Bildirim Gerekli**
> Devam etmeden önce aşağıdaki açık soruları netleştirmemiz gerekiyor.

## Açık Sorular (Cevaplanması Gerekenler)

1. **Fatura Hesaplaması:** Fiyatlandırma hesaplanırken bu üç tehlike sınıfının **toplam** çalışan sayısına göre mi fatura kesilecek, yoksa her tehlike sınıfının fiyatlandırması/ücreti ayrı mı hesaplanıyor? (Şu anki sistemde sadece toplam çalışan sayısı üzerinden Standart/Kademeli fiyatlandırma yapılıyor).
2. **Fatura Kalemleri (Fatura Görünümü):** Kesilecek faturada tek bir satırda "Toplam X Çalışan" mı yazmalı, yoksa faturanın içinde "Az Tehlikeli: X Kişi", "Tehlikeli: Y Kişi" şeklinde ayrı kalemler (satırlar) olarak mı görünmeli?
3. **Eşleştirme Mantığı:** Excel'den gelen "Hizmet Alan İşyeri Tehlike Sınıfı" sütunundaki çalışan sayısını, firmanın kayıtlı tehlike sınıfı sayısıyla eşleştirdiğimizde, eğer sayılar farklıysa (örneğin kayıtlı 10, excelden 12 geldi) fatura Excel'den gelen yeni sayıya göre mi güncellenecek?

Planı onaylıyorsanız veya sorularla ilgili eklemek istedikleriniz varsa lütfen belirtin. İşlemlere hemen başlayacağım.
