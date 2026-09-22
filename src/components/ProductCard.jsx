import { Link } from 'react-router-dom'

const CATEGORY_LABEL = {
  ebook: 'eBook',
  pdf_guide: 'PDF Guide',
  sample_kit: 'Sample Kit',
  drum_kit: 'Drum Kit',
}

const CATEGORY_COLOR = {
  ebook: 'bg-dmp-yellow text-black',
  pdf_guide: 'bg-dmp-red text-white',
  sample_kit: 'bg-dmp-green text-black',
  drum_kit: 'bg-white text-black',
}

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.id}`} className="card p-3 flex flex-col gap-3">
      <div className="relative aspect-square rounded-lg overflow-hidden bg-dmp-charcoal">
        <img
          src={product.cover_url || '/favicon.svg'}
          alt={product.title}
          className="w-full h-full object-cover"
        />
        <span className={`absolute top-2 left-2 badge ${CATEGORY_COLOR[product.category]}`}>
          {CATEGORY_LABEL[product.category]}
        </span>
      </div>
      <div>
        <p className="font-semibold text-sm truncate">{product.title}</p>
        <p className="text-dmp-green font-display font-bold mt-1">${Number(product.price).toFixed(2)}</p>
      </div>
    </Link>
  )
}
