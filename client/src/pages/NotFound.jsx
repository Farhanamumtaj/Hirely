import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <section className="container text-center py-5">
      <p className="display-1 fw-bold">404</p>
      <h1 className="h3">Page not found</h1>
      <p className="text-secondary">
        That page doesn't exist or may have moved.
      </p>
      <Link className="btn btn-dark" to="/">
        Go home
      </Link>
    </section>
  );
}
