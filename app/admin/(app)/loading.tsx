function SkeletonLine({ className = "" }: { className?: string }) {
  return <span className={`admin-loading-skeleton ${className}`} />;
}

export default function AdminLoading() {
  const metrics = ["members", "leads", "subscribers", "delivery"];
  const rows = Array.from({ length: 9 }, (_, index) => index);

  return (
    <div className="admin-loading" role="status" aria-label="Loading admin content">
      <div className="admin-loading-heading">
        <div>
          <SkeletonLine className="eyebrow" />
          <SkeletonLine className="title" />
          <SkeletonLine className="description" />
        </div>
        <SkeletonLine className="action" />
      </div>

      <div className="admin-loading-toolbar">
        <SkeletonLine className="search" />
        <SkeletonLine className="select" />
        <SkeletonLine className="select" />
        <span className="admin-loading-pulse-dot" />
      </div>

      <div className="admin-loading-metrics">
        {metrics.map((metric) => (
          <div className="admin-loading-metric" key={metric}>
            <SkeletonLine className="metric-label" />
            <SkeletonLine className="metric-value" />
            <SkeletonLine className="metric-note" />
          </div>
        ))}
      </div>

      <section className="admin-loading-panel">
        <div className="admin-loading-panel-head">
          <div>
            <SkeletonLine className="panel-title" />
            <SkeletonLine className="panel-subtitle" />
          </div>
          <SkeletonLine className="panel-action" />
        </div>
        <div className="admin-loading-table" aria-hidden="true">
          {rows.map((row) => (
            <div className="admin-loading-row" key={row}>
              <SkeletonLine className="avatar" />
              <div>
                <SkeletonLine className="name" />
                <SkeletonLine className="email" />
              </div>
              <SkeletonLine className="role" />
              <SkeletonLine className="city" />
              <SkeletonLine className="badge" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
