import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <section className="page-panel not-found">
      <p className="eyebrow">404</p>
      <h1>Route outside known space.</h1>
      <p className="page-copy">The page you requested is not mapped in this sector.</p>
      <Link className="primary-action" to="/">
        Return home
      </Link>
    </section>
  )
}

export default NotFound
