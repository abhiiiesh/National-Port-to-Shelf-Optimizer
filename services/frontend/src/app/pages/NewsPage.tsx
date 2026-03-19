import { newsItems } from '../mock-data';

export function NewsPage(): JSX.Element {
  return (
    <section>
      <h2 className="page-heading">Operations News</h2>
      <article className="card">
        <ul>
          {newsItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
