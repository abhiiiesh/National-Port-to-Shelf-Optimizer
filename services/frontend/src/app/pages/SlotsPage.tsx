import { slotPlans } from '../mock-data';

export function SlotsPage(): JSX.Element {
  return (
    <section>
      <h2 className="page-heading">Slot Planning</h2>
      <div className="grid kpis">
        {slotPlans.map((slot) => (
          <article className="card" key={slot.mode}>
            <h3>{slot.mode}</h3>
            <div className="kpi-label">{slot.corridor}</div>
            <div className="kpi-value">{slot.available} slots</div>
            <div className="progress">
              <span style={{ width: `${slot.utilization}%` }} />
            </div>
            <div className="kpi-trend up">{slot.utilization}% utilized</div>
          </article>
        ))}
      </div>
    </section>
  );
}
