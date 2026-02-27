import SearchBar from '@/components/SearchBar'

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-brand-500 mb-2">İETT Canlı</h1>
        <p className="text-slate-400 text-sm">
          İstanbul otobüslerini gerçek zamanlı takip et
        </p>
      </div>

      <SearchBar />

      <div className="text-center text-slate-500 text-sm mt-4">
        Durak adı veya hat numarası yazarak arama yapın
      </div>
    </div>
  )
}
