import { T, STATUSES, PRIORITIES, statusColor, priorityColor, stripEmoji } from '../styles/tokens';
import { StatCard, BugRow, TableHeader, Card, SectionLabel, Avatar, ProgressBar } from '../components/ui';

export default function SummaryView({ bugs, allBugs, meta, onSelect }) {
  const done = bugs.filter((b) => b.status === 'Done').length;
  const active = bugs.length - done;
  const inRev = bugs.filter((b) => b.status === 'In Review' || b.status === 'Reviewing').length;
  const critical = bugs.filter((b) => (b.priority === 'Critical' || b.priority.startsWith('P1')) && b.status !== 'Done').length;
  const overdue = bugs.filter((b) => b.due && new Date(b.due) < new Date() && b.status !== 'Done').length;

  const members = meta.members?.length > 0
    ? meta.members
    : [...new Set(bugs.map((b) => b.assignee).filter((a) => a && a !== 'Unassigned'))];
  const memberLoad = members.map((m) => ({
    name: m, count: bugs.filter((b) => b.assignee === m && b.status !== 'Done').length,
  }));
  const maxLoad = Math.max(...memberLoad.map((m) => m.count), 1);

  return (
    <div className="fade-in" style={{ padding: 32 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Active" value={active} sub={`${done} resolved`} />
        <StatCard label="Critical" value={critical} color={T.critical} sub="needs attention" />
        <StatCard label="Overdue" value={overdue} color={T.high} sub="past due date" />
        <StatCard label="In Review" value={inRev} color={T.inReview} sub="awaiting merge" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <Card style={{ padding: '22px 26px' }}>
          <SectionLabel>Status Breakdown</SectionLabel>
          {(meta.statuses?.length > 0 ? meta.statuses : STATUSES).map((s) => {
            const count = bugs.filter((b) => b.status === s).length;
            const pct = bugs.length > 0 ? ((count / bugs.length) * 100).toFixed(0) : 0;
            return (
              <div key={s} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '13px', fontFamily: T.fontSans, fontWeight: 500 }}>{s}</span>
                  <span style={{ fontSize: '12px', fontFamily: T.font, color: T.textDim }}>{count} ({pct}%)</span>
                </div>
                <ProgressBar value={count} max={bugs.length} color={statusColor(s)} />
              </div>
            );
          })}
        </Card>
        <Card style={{ padding: '22px 26px' }}>
          <SectionLabel>Priority Breakdown</SectionLabel>
          {(meta.priorities?.length > 0 ? meta.priorities : PRIORITIES).map((p) => {
            const count = bugs.filter((b) => b.priority === p).length;
            const pct = bugs.length > 0 ? ((count / bugs.length) * 100).toFixed(0) : 0;
            return (
              <div key={p} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '13px', fontFamily: T.fontSans, fontWeight: 500 }}>{stripEmoji(p)}</span>
                  <span style={{ fontSize: '12px', fontFamily: T.font, color: T.textDim }}>{count} ({pct}%)</span>
                </div>
                <ProgressBar value={count} max={bugs.length} color={priorityColor(p)} />
              </div>
            );
          })}
        </Card>
      </div>

      <Card style={{ padding: '22px 26px', marginBottom: 28 }}>
        <SectionLabel>Workload by Member</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {memberLoad.map((m) => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={m.name} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: 4, fontFamily: T.fontSans }}>{m.name.split(' ')[0]}</div>
                <ProgressBar value={m.count} max={maxLoad} color={m.count > 6 ? T.critical : T.accent} height={4} />
              </div>
              <span style={{ fontFamily: T.font, fontSize: '12px', color: m.count > 6 ? T.critical : T.textDim, fontWeight: 600 }}>{m.count}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ padding: '16px 26px', borderBottom: `1px solid ${T.border}` }}>
          <SectionLabel>Critical & High Priority</SectionLabel>
        </div>
        <TableHeader />
        {(() => {
          const critBugs = (allBugs || bugs).filter((b) => (b.priority === 'Critical' || b.priority === 'High' || b.priority.startsWith('P1') || b.priority.startsWith('P2')) && b.status !== 'Done').slice(0, 10);
          return critBugs.length > 0
            ? critBugs.map((bug) => <BugRow key={bug.id} bug={bug} onClick={onSelect} />)
            : <div style={{ padding: 40, textAlign: 'center', color: T.textDim, fontFamily: T.fontSans }}>No critical issues</div>;
        })()}
      </Card>

      <Card style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 26px', borderBottom: `1px solid ${T.border}` }}>
          <SectionLabel>Filtered Results</SectionLabel>
        </div>
        <TableHeader />
        {bugs.filter((b) => b.status !== 'Done').slice(0, 10)
          .map((bug) => <BugRow key={bug.id} bug={bug} onClick={onSelect} />)}
      </Card>
    </div>
  );
}
