"use client";

import { useState, useEffect, useCallback } from "react";

interface ReviewRow {
  rowNumber: number;
  no: string;
  tempatWisata: string;
  namaPengulas: string;
  rating: string;
  labelOtomatis: string;
  teksUlasan: string;
  labelManual: string;
  tanggal: string;
  suka: string;
  balasanPemilik: string;
}

type Label = "netral" | "positif" | "negatif";

const LABELS: { value: Label; label: string; key: string; color: string; activeColor: string }[] = [
  { value: "netral", label: "Netral", key: "1", color: "bg-slate-200 text-slate-800 hover:bg-slate-300", activeColor: "bg-slate-600 text-white ring-2 ring-slate-800" },
  { value: "positif", label: "Positif", key: "2", color: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200", activeColor: "bg-emerald-600 text-white ring-2 ring-emerald-800" },
  { value: "negatif", label: "Negatif", key: "3", color: "bg-red-100 text-red-800 hover:bg-red-200", activeColor: "bg-red-600 text-white ring-2 ring-red-800" },
];

export default function Home() {
  const [allRows, setAllRows] = useState<ReviewRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAllRows(data.rows);
    } catch (e: unknown) {
      setError((e as Error).message || "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ponytail: prioritas urutan — netral (3★) → positif (4-5★) → negatif (1-2★)
  const ratingGroup = (r: ReviewRow) => {
    const n = parseInt(r.rating) || 0;
    if (n === 3) return 0; // netral first
    if (n >= 4) return 1;  // positif second
    return 2;              // negatif last
  };
  const unlabeled = allRows
    .filter((r) => !r.labelManual)
    .sort((a, b) => ratingGroup(a) - ratingGroup(b));
  const current = unlabeled[currentIndex];
  const totalUnlabeled = unlabeled.length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleLabel = async (label: Label) => {
    if (!current || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: current.rowNumber, label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update local state immediately
      setAllRows((prev) =>
        prev.map((r) =>
          r.rowNumber === current.rowNumber ? { ...r, labelManual: label } : r
        )
      );
      showToast(`Tersimpan: ${label.charAt(0).toUpperCase() + label.slice(1)}`);
      // Move to next (index stays since current item leaves unlabeled list)
      // If at end, stay at last valid index
      if (currentIndex >= totalUnlabeled - 1) {
        setCurrentIndex(Math.max(0, totalUnlabeled - 2));
      }
    } catch (e: unknown) {
      showToast((e as Error).message || "Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!current || saving) return;
    setSaving(true);
    setShowDeleteModal(false);
    try {
      const res = await fetch("/api/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: current.rowNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("Ulasan dihapus.");
      // Re-fetch because row numbers shifted
      await fetchData();
      // Adjust index if needed
      if (currentIndex >= totalUnlabeled - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } catch (e: unknown) {
      showToast((e as Error).message || "Gagal menghapus. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showDeleteModal) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "1") handleLabel("netral");
      else if (e.key === "2") handleLabel("positif");
      else if (e.key === "3") handleLabel("negatif");
      else if (e.key === "ArrowLeft") setCurrentIndex((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setCurrentIndex((i) => Math.min(totalUnlabeled - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, saving, showDeleteModal, totalUnlabeled]);

  // Stars display
  const renderRating = (rating: string) => {
    const n = parseInt(rating) || 0;
    return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-lg">Memuat data ulasan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="text-red-600 text-lg">{error}</div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (totalUnlabeled === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Semua ulasan sudah diberi label!</h2>
          <p className="text-gray-500">
            Total {allRows.length} ulasan telah dianotasi.
          </p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header & Progress */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">Anotasi Sentimen</h1>
          <span className="text-sm text-gray-500">
            {currentIndex + 1} dari {totalUnlabeled} tersisa
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((allRows.length - totalUnlabeled) / allRows.length) * 100}%`,
            }}
          />
        </div>

        {/* Annotation Guideline — Lampiran X */}
        <details className="mb-4 bg-white rounded-xl border border-gray-200">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-blue-700 hover:text-blue-800 select-none">
            📋 Panduan Anotasi (Lampiran X)
          </summary>
          <div className="px-4 pb-4 text-sm text-gray-700 space-y-4 border-t border-gray-100 pt-3">
            {/* Prinsip */}
            <p className="text-xs text-gray-500 italic">
              Label ditentukan berdasarkan makna keseluruhan (<em>overall sentiment</em>) ulasan, bukan rating.
              Rating hanya digunakan sebagai pendukung jika teks sangat ambigu.
            </p>

            {/* Definisi Label */}
            <div>
              <strong className="text-emerald-700">Positif</strong> — Ulasan secara keseluruhan menunjukkan pengalaman memuaskan atau penilaian baik.
              <br />
              <span className="text-gray-500 text-xs">
                Ciri: lebih banyak memuji, merekomendasikan, kepuasan dominan, kekurangan hanya ringan.
                <br />Contoh: &quot;Tempatnya sangat indah dan bersih&quot; · &quot;Worth it banget buat dikunjungi&quot;
                <br />&quot;Jalannya agak sempit, tapi pemandangannya luar biasa&quot; → Positif (kekurangan ringan)
              </span>
            </div>

            <div>
              <strong className="text-red-700">Negatif</strong> — Ulasan secara keseluruhan menunjukkan ketidakpuasan terhadap destinasi.
              <br />
              <span className="text-gray-500 text-xs">
                Ciri: lebih banyak mengeluh, kecewa, kekurangan memengaruhi pengalaman, tidak merekomendasikan.
                <br />Contoh: &quot;Toilet sangat kotor&quot; · &quot;View bagus, tapi fasilitas rusak dan tidak terawat&quot; → Negatif
              </span>
            </div>

            <div>
              <strong className="text-slate-700">Netral</strong> — Tidak menunjukkan kecenderungan positif maupun negatif yang kuat.
              <br />
              <span className="text-gray-500 text-xs">
                Meliputi: (A) Informasi tanpa opini — &quot;Tiket masuk Rp15.000&quot;
                <br />(B) Opini seimbang — kelebihan dan kekurangan bobotnya hampir sama.
                <br />&quot;Air terjunnya bagus, namun akses menuju lokasi cukup sulit&quot; → Netral
              </span>
            </div>

            <hr className="border-gray-200" />

            {/* Aturan Penentuan */}
            <p className="font-semibold text-gray-800 text-xs uppercase tracking-wide">Aturan Penentuan Label</p>

            <div>
              <strong>1. Makna keseluruhan</strong> — Gunakan kesan utama penulis, bukan jumlah kata positif/negatif.
            </div>

            <div>
              <strong>2. Kata penghubung</strong> — Perhatikan <em>tetapi, namun, tapi, walaupun, meskipun</em> — bagian setelahnya sering merupakan inti pendapat.
              <br />
              <span className="text-gray-500 text-xs">
                &quot;Jalannya rusak, tapi pemandangannya luar biasa&quot; → Positif
                <br />&quot;Pemandangannya bagus, tapi toiletnya sangat kotor&quot; → Negatif
              </span>
            </div>

            <div>
              <strong>3. Multi-aspek</strong> — Jika membahas beberapa aspek (pemandangan, akses, fasilitas, harga, kebersihan), label berdasarkan pengalaman keseluruhan, bukan banyaknya aspek.
            </div>

            <div>
              <strong>4. Dulu vs sekarang</strong> — Jika membandingkan kondisi masa lalu dan sekarang, ikuti kondisi saat ini.
              <br />
              <span className="text-gray-500 text-xs">
                &quot;Dulu bagus, sekarang hampir terbengkalai&quot; → Negatif
                <br />&quot;Dulu biasa saja, sekarang jauh lebih bagus&quot; → Positif
              </span>
            </div>

            <div>
              <strong>5. Seimbang?</strong> Jika kelebihan dan kekurangan bobotnya hampir sama → <strong>Netral</strong>.
            </div>

            <div>
              <strong>6. Dominan?</strong> Jika salah satu sisi jauh lebih dominan → ikuti sisi dominan.
              <br />
              <span className="text-gray-500 text-xs">
                &quot;Pemandangannya bagus, tapi toilet kotor, parkiran sempit, banyak sampah&quot; → Negatif
              </span>
            </div>

            <hr className="border-gray-200" />

            {/* Rating & Hapus */}
            <div>
              <strong>Rating vs teks bertentangan?</strong> Ikuti isi teks. Prioritas: isi ulasan → makna keseluruhan → rating.
              <br />
              <span className="text-gray-500 text-xs">
                ⭐⭐⭐⭐⭐ &quot;Toilet kotor dan fasilitas rusak&quot; → Negatif · ⭐⭐ &quot;Tempatnya sangat indah&quot; → Positif
              </span>
            </div>

            <div>
              <strong className="text-red-600">Hapus</strong> (jangan dilabeli) jika ulasan: hanya emoji, hanya satu kata tanpa konteks (&quot;Ok&quot;, &quot;Nice&quot;), spam, duplikat, atau seluruh isi berbahasa asing.
            </div>

            <hr className="border-gray-200" />

            {/* Tabel Ringkasan */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 pr-2 font-semibold text-gray-600">Kondisi</th>
                    <th className="text-left py-1.5 font-semibold text-gray-600">Label</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100"><td className="py-1 pr-2">Mayoritas memuji</td><td className="text-emerald-700 font-medium">Positif</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1 pr-2">Mayoritas mengeluh</td><td className="text-red-700 font-medium">Negatif</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1 pr-2">Kekurangan hanya ringan</td><td className="text-emerald-700 font-medium">Positif</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1 pr-2">Kelebihan &amp; kekurangan seimbang</td><td className="text-slate-700 font-medium">Netral</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1 pr-2">Informasi tanpa opini</td><td className="text-slate-700 font-medium">Netral</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1 pr-2">Banyak pujian, sedikit kritik</td><td className="text-emerald-700 font-medium">Positif</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1 pr-2">Sedikit kelebihan, banyak keluhan</td><td className="text-red-700 font-medium">Negatif</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-1 pr-2">Rating bertentangan dengan isi</td><td className="font-medium">Ikuti isi ulasan</td></tr>
                  <tr><td className="py-1 pr-2">Perbandingan dulu–sekarang</td><td className="font-medium">Ikuti kondisi saat ini</td></tr>
                </tbody>
              </table>
            </div>

            <hr className="border-gray-200" />

            <div className="text-xs text-gray-400">
              Shortcut keyboard: <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">1</kbd> Netral · <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">2</kbd> Positif · <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">3</kbd> Negatif · <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">←→</kbd> Navigasi
            </div>
          </div>
        </details>

        {/* Review Card */}
        {current && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 mb-4">
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
              <span className="font-semibold text-gray-800">{current.tempatWisata}</span>
              <span className="text-amber-500 tracking-wider" title={`Rating ${current.rating}/5`}>
                {renderRating(current.rating)}
              </span>
            </div>

            {/* Review text */}
            <p className="text-gray-700 leading-relaxed text-base whitespace-pre-wrap">
              {current.teksUlasan || <span className="italic text-gray-400">(Ulasan kosong)</span>}
            </p>

            {/* Extra info */}
            {current.tanggal && (
              <div className="mt-3 text-xs text-gray-400">
                {current.tanggal}
                {current.namaPengulas && ` · ${current.namaPengulas}`}
              </div>
            )}

            {/* Existing auto-label indicator */}
            {current.labelOtomatis && (
              <div className="mt-2">
                <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                  Label otomatis: {current.labelOtomatis}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Label Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          {LABELS.map((l) => (
            <button
              key={l.value}
              onClick={() => handleLabel(l.value)}
              disabled={saving || !current}
              className={`min-h-[48px] sm:min-h-[44px] rounded-xl font-semibold text-base transition-all duration-150 cursor-pointer disabled:opacity-50 ${
                current?.labelManual === l.value ? l.activeColor : l.color
              }`}
            >
              {l.label}
              <span className="ml-1.5 text-xs opacity-60">({l.key})</span>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 cursor-pointer"
          >
            ← Sebelumnya
          </button>
          <button
            onClick={() => setCurrentIndex((i) => Math.min(totalUnlabeled - 1, i + 1))}
            disabled={currentIndex >= totalUnlabeled - 1}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 cursor-pointer"
          >
            Lewati →
          </button>
        </div>

        {/* Delete Button */}
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={saving || !current}
            className="w-full sm:w-auto px-4 py-2.5 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            🗑️ Hapus Ulasan Ini
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Ulasan?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Ulasan akan dipindahkan ke sheet &quot;data terhapus&quot; dan tidak bisa dianotasi lagi di sini.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 text-white text-sm rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
