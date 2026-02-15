import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchBugs, fetchMeta, updateBug, createBug } from '../lib/api';

export function useBugs() {
  const [bugs, setBugs] = useState([]);
  const [meta, setMeta] = useState({ members: [], projects: [], sprints: [], statuses: [], priorities: [], tags: [], types: [], scopes: [], sizes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterProject, setFilterProject] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterMember, setFilterMember] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [bugsRes, metaRes] = await Promise.all([fetchBugs(), fetchMeta()]);
      setBugs(bugsRes.bugs);
      setMeta(metaRes);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredBugs = useMemo(() => {
    return bugs.filter((b) => {
      if (filterProject !== 'All' && b.project !== filterProject) return false;
      if (filterPriority !== 'All' && b.priority !== filterPriority) return false;
      if (filterMember !== 'All' && b.assignee !== filterMember) return false;
      if (filterStatus !== 'All' && b.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!b.title.toLowerCase().includes(q) && !b.id.toLowerCase().includes(q) && !(b.tags || []).some((t) => t.toLowerCase().includes(q)))
          return false;
      }
      return true;
    });
  }, [bugs, filterProject, filterPriority, filterMember, filterStatus, searchQuery]);

  const handleUpdate = useCallback(async (id, updates) => {
    try {
      const updated = await updateBug(id, updates);
      setBugs((prev) => prev.map((b) => (b.id === id || b.notionId === id ? updated : b)));
      return updated;
    } catch (err) { setError(err.message); throw err; }
  }, []);

  const handleCreate = useCallback(async (bugData) => {
    try {
      const created = await createBug(bugData);
      setBugs((prev) => [created, ...prev]);
      return created;
    } catch (err) { setError(err.message); throw err; }
  }, []);

  return {
    bugs: filteredBugs, allBugs: bugs, meta, loading, error,
    reload: load, updateBug: handleUpdate, createBug: handleCreate,
    filters: {
      project: filterProject, priority: filterPriority, member: filterMember,
      status: filterStatus, search: searchQuery,
      setProject: setFilterProject, setPriority: setFilterPriority,
      setMember: setFilterMember, setStatus: setFilterStatus, setSearch: setSearchQuery,
    },
  };
}
