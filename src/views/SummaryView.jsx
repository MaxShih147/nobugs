import { T, STATUSES, PRIORITIES, statusColor, priorityColor } from '../styles/tokens';
import { StatCard, BugRow, Card, SectionLabel, Avatar, ProgressBar } from '../components/ui';

export default function SummaryView({ bugs, meta, onSelect }) {
  const open = bugs.filter((b) => b.status === 'Open').length;
  const inProg = bugs.filter((b) => b.status === 'In Progress').length;
  const inRev = bugs.filter((b) => b.status === 'In Review').length;
  const done = bugs.filter((b) => b.status === 'Done').length;
  const critical = bugs.filter((b) => b.priority === 'Critical' && b.status !== 'Done').length;
  const overdue = bugs.filter((b) => b.due && new Date(b.due) < new Date() && b.status !== 'Done').length;

  const memberLoad = meta.members.map((m) => ({
    name: m, count: bugs.filter((b) => b.assignee === m && b.status !== 'Done').length,
  }));
  const maxLoad = Math.max(...memberLoad.map((m) => m.count), 1);

  return (
    <div className="fade-in" style={{ padding: 32 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Total Open" value={open + inProg + inRev} sub={`${done} resolved`} />
        <StatCard label="Critical" value={critical} color={T.critical} sub="needs attention" />
        <StatCard label="Overdue" value={overdue} color={T.high} sub="past due date" />
        <StatCard label="In Review" value={inRev} color={T.inReview} sub="awaiting merge" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <Card style={{ padding: '20px 24px' }}>
          <SectionLabel>Status Breakdown</SectionLabel>
          {STATUSES.map((s) => {
            const count = bugs.filter((b) => b.status === s).length;
            const pct = bugs.length > 0 ? ((count / bugs.length) * 100).toFixed(0) : 0;
            return (
              <div key={s} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '13px' }}>{s}</span>
                  <span style={{ fontSize: '12px', fontFamily: T.font, color: T.textDim }}>{count} ({pct}%)</span>
                </div>
                <ProgressBar value={count} max={bugs.length} color={statusColor(s)} />
              </div>
            );
          })}
        </Card>
        <Card style={{ padding: '20px 24px' }}>
          <SectionLabel>Priority Breakdown</SectionLabel>
          {PRIORITIES.map((p) => {
            const count = bugs.filter((b) => b.priority === p).length;
            const pct = bugs.length > 0 ? ((count / bugs.length) * 100).toFixed(0) : 0;
            return (
              <div key={p} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '13px' }}>{p}</span>
                  <span style={{ fontSize: '12px', fontFamily: T.font, color: T.textDim }}>{count} ({pct}%)</span>
                </div>
                <ProgressBar value={count} max={bugs.length} color={priorityColor(p)} />
              </div>
            );
          })}
        </Card>
      </div>

      <Card style={{ padding: '20px 24px', marginBottom: 28 }}>
        <SectionLabel>Workload by Member (active bugs)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {memberLoad.map((m) => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={m.name} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: 3 }}>{m.name.split(' ')[0]}</div>
                <ProgressBar value={m.count} max={maxLoad} color={m.count > 6 ? T.critical : T.accent} height={4} />
              </div>
              <span style={{ fontFamily: T.font, fontSize: '12px', color: m.count > 6 ? T.critical : T.textDim, fontWeight: 600 }}>{m.count}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}` }}>
          <SectionLabel>Critical & High Priority (Active)</SectionLabel>
        </div>
        {bugs.filter((b) => (b.priority === 'Critical' || b.priority === 'High') && b.status !== 'Done').slice(0, 10)
          .map((bug) => <BugRow key={bug.id} bug={bug} onClick={onSelect} />)}
      </Card>
    </div>
  );
}
