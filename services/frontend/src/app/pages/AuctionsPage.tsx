import { auctions } from '../mock-data';

export function AuctionsPage(): JSX.Element {
  return (
    <section>
      <h2 className="page-heading">Dynamic Slot Auctions</h2>
      <article className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Auction ID</th>
              <th>Lane</th>
              <th>Highest Bid</th>
              <th>Bids</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map((auction) => (
              <tr key={auction.id}>
                <td>{auction.id}</td>
                <td>{auction.lane}</td>
                <td>{auction.highestBid}</td>
                <td>{auction.bids}</td>
                <td>
                  <span className={`badge ${auction.status === 'Open' ? 'ok' : 'warn'}`}>
                    {auction.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
