import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  AlertCircle,
  Calendar,
  ChefHat,
  Clock,
  Filter,
  Flame,
  History,
  Link2,
  ListTodo,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
  X
} from 'lucide-react';

const EMPTY_TABLE_FORM = {
  table_number: '',
  floor: 'Main Floor',
  capacity: '4'
};

const SERVICE_STAGES = [
  { value: 'SERVING', label: 'Serving' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'REFILLING', label: 'Refilling' },
  { value: 'READY', label: 'Ready for next guest' }
];

const getTicketList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.kots)) return data.kots;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatDateTime = (value) => {
  if (!value) return 'Time unavailable';

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : date.toLocaleString();
};

const formatElapsed = (startedAt, now) => {
  if (!startedAt) return '00:00:00';

  const timestamp = new Date(startedAt).getTime();
  if (!Number.isFinite(timestamp)) return '00:00:00';

  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};

const formatDuration = (value) => {
  const totalSeconds = Math.max(0, Number(value) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNextAction = (status) => {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
      return { label: 'Start Cooking', nextStatus: 'COOKING' };
    case 'COOKING':
      return { label: 'Mark Ready', nextStatus: 'READY' };
    case 'READY':
      return { label: 'Mark Served', nextStatus: 'SERVED' };
    default:
      return null;
  }
};

const getStatusClasses = (status) => {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800';
    case 'COOKING':
      return 'bg-indigo-100 text-indigo-800';
    case 'READY':
      return 'bg-emerald-100 text-emerald-800';
    case 'SERVED':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

/* --------------------------- Shared table helpers --------------------------- */

const getServiceState = (table) => {
  if (table.service_state) {
    return String(table.service_state).toUpperCase();
  }

  return table.active_order ? 'SERVING' : 'READY';
};

const readTableOverrides = (storageKey) => {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.warn('Could not read locally saved table edits:', error);
    return {};
  }
};

const mergeTableOverrides = (serverTables, overrides) =>
  serverTables.map((table) => ({
    ...table,
    ...(overrides[String(table.id)] || {})
  }));

const getNextTableNumber = (tables) => {
  const highestNumber = tables.reduce((highest, table) => {
    const match = String(table.table_number || '').match(/(\d+)\s*$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `T-${highestNumber + 1}`;
};

const groupTablesForDisplay = (tables) => {
  const groups = new Map();

  tables.forEach((table) => {
    const key = table.merge_group_id
      ? `merged:${table.merge_group_id}`
      : `table:${table.id}`;

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        mergeGroupId: table.merge_group_id || null,
        members: []
      });
    }

    groups.get(key).members.push(table);
  });

  return [...groups.values()].map((group) => ({
    ...group,
    members: [...group.members].sort((a, b) =>
      String(a.table_number || '').localeCompare(
        String(b.table_number || ''),
        undefined,
        { numeric: true }
      )
    )
  }));
};

const getTableServiceSeconds = (table, now) => {
  if (getServiceState(table) === 'READY') {
    return Math.max(0, Number(table.service_state_duration_seconds) || 0);
  }

  const startedAt =
    table.service_state_started_at ||
    (table.active_order ? table.updated_at || table.created_at : null);

  if (!startedAt) return 0;

  const startTime = new Date(startedAt).getTime();
  if (!Number.isFinite(startTime)) return 0;

  return Math.max(0, Math.floor((now - startTime) / 1000));
};

const getGroupSortValue = (group, sortKey, now) => {
  if (sortKey === 'capacity') {
    return group.members.reduce(
      (total, table) => total + (Number(table.capacity) || 0),
      0
    );
  }

  // For joined tables, use the longest service time in the group.
  return Math.max(
    0,
    ...group.members.map((table) => getTableServiceSeconds(table, now))
  );
};

/* ---------------------------- Per-table timer ------------------------------ */

const TableServiceTimer = ({ table, onUpdated, onReset }) => {
  const serviceState = getServiceState(table);
  const isReady = serviceState === 'READY';

  const [now, setNow] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isReady) return undefined;

    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [isReady]);

  const startTime =
    table.service_state_started_at ||
    (table.active_order ? table.updated_at || table.created_at : null);

  const displayedTime = isReady
    ? formatDuration(table.service_state_duration_seconds)
    : formatElapsed(startTime, now);

  const stateLabel =
    SERVICE_STAGES.find((stage) => stage.value === serviceState)?.label ||
    serviceState;

  const changeStage = async (nextState) => {
    if (saving || nextState === serviceState) return;

    setSaving(true);
    setError('');

    try {
      const response = await api.put(
        `/restaurant/tables/${table.id}/service-state`,
        { state: nextState }
      );

      if (response.data) onUpdated?.(response.data);
    } catch (requestError) {
      console.error('Failed to update table service stage:', requestError);
      setError(
        requestError.response?.data?.detail ||
          'Could not update the table service timer.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Table service
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">{stateLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`font-mono text-lg font-black tabular-nums ${
              isReady ? 'text-emerald-700' : 'text-indigo-700'
            }`}
            aria-label={`${stateLabel} time: ${displayedTime}`}
          >
            {displayedTime}
          </div>

          <button
            type="button"
            onClick={() => onReset?.(table)}
            title="Reset this table's service timer"
            aria-label={`Reset timer for ${table.table_number || 'table'}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-indigo-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <label className="mt-3 block text-[10px] font-semibold text-slate-500">
        Update service stage
        <select
          value={serviceState}
          disabled={saving}
          onChange={(event) => changeStage(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
        >
          {SERVICE_STAGES.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
};

/* --------------------------- Table management page ------------------------- */

export const RestaurantTables = () => {
  const { tenant } = useAuth();
  const tenantKey = tenant?.id || tenant?.slug || tenant?.name || 'default';
  const storageKey = `restaurant-table-edits:${tenantKey}`;

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState('');

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState(EMPTY_TABLE_FORM);
  const [isSavingTable, setIsSavingTable] = useState(false);
  const [tableFormError, setTableFormError] = useState('');

  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [selectedMergeTableIds, setSelectedMergeTableIds] = useState([]);
  const [isMergingTables, setIsMergingTables] = useState(false);
  const [mergeTableError, setMergeTableError] = useState('');

  const [deletingTableId, setDeletingTableId] = useState(null);
  const [updatingTableStatusId, setUpdatingTableStatusId] = useState(null);

  // Capacity is the initial sort; clicking the selected sort toggles direction.
  const [sortMode, setSortMode] = useState({
    key: 'capacity',
    direction: 'desc'
  });
  const [sortNow, setSortNow] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setSortNow(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const displayGroups = useMemo(() => {
    const groups = groupTablesForDisplay(tables);

    return [...groups].sort((a, b) => {
      const difference =
        getGroupSortValue(a, sortMode.key, sortNow) -
        getGroupSortValue(b, sortMode.key, sortNow);

      if (difference !== 0) {
        return sortMode.direction === 'asc' ? difference : -difference;
      }

      return String(a.members[0]?.table_number || '').localeCompare(
        String(b.members[0]?.table_number || ''),
        undefined,
        { numeric: true }
      );
    });
  }, [tables, sortMode, sortNow]);

  const mergeableTables = useMemo(
    () =>
      tables.filter(
        (table) =>
          !table.merge_group_id &&
          String(table.status || 'FREE').toUpperCase() === 'FREE' &&
          !table.active_order
      ),
    [tables]
  );

  const fetchTables = useCallback(async () => {
    setTableError('');

    try {
      const response = await api.get('/restaurant/tables');
      const serverTables = Array.isArray(response.data) ? response.data : [];

      setTables(
        mergeTableOverrides(serverTables, readTableOverrides(storageKey))
      );
    } catch (error) {
      console.error('Failed to load restaurant tables:', error);
      setTableError(
        error.response?.data?.detail || 'Could not load restaurant tables.'
      );
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    setLoading(true);
    fetchTables();
  }, [fetchTables]);

  const handleTableSort = (key) => {
    setSortMode((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'desc' ? 'asc' : 'desc'
        };
      }

      return { key, direction: 'desc' };
    });
  };

  const sortArrow = (key) => {
    if (sortMode.key !== key) return '';
    return sortMode.direction === 'desc' ? ' ↓' : ' ↑';
  };

  const sortButtonClass = (key) =>
    `inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${
      sortMode.key === key
        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
    }`;

  const updateTableInState = (updatedTable) => {
    if (!updatedTable?.id) return;

    setTables((current) =>
      current.map((table) =>
        String(table.id) === String(updatedTable.id)
          ? { ...table, ...updatedTable }
          : table
      )
    );
  };

  const saveLocalTableOverride = (tableId, values) => {
    const overrides = readTableOverrides(storageKey);

    overrides[String(tableId)] = {
      ...(overrides[String(tableId)] || {}),
      ...values
    };

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(overrides));
    } catch (error) {
      console.warn('Could not persist table edits in this browser:', error);
    }
  };

  const removeLocalTableOverride = (tableId) => {
    const overrides = readTableOverrides(storageKey);
    delete overrides[String(tableId)];

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(overrides));
    } catch (error) {
      console.warn('Could not remove locally saved table edit:', error);
    }
  };

  // Reset only the selected table's timer; save its timer fields as a local override.
  const handleResetTableTimer = (table) => {
    const now = new Date().toISOString();
    const updates = {
      service_state_started_at: now,
      service_state_duration_seconds: 0,
      updated_at: now
    };

    updateTableInState({
      ...table,
      ...updates
    });

    saveLocalTableOverride(table.id, updates);
  };

  const openAddTableModal = () => {
    setEditingTable(null);
    setTableForm({
      ...EMPTY_TABLE_FORM,
      table_number: getNextTableNumber(tables)
    });
    setTableFormError('');
    setIsTableModalOpen(true);
  };

  const openEditTableModal = (table) => {
    setEditingTable(table);
    setTableForm({
      table_number: table.table_number || '',
      floor: table.floor || 'Main Floor',
      capacity: String(table.capacity ?? 4)
    });
    setTableFormError('');
    setIsTableModalOpen(true);
  };

  const closeTableModal = () => {
    if (isSavingTable) return;

    setIsTableModalOpen(false);
    setEditingTable(null);
    setTableFormError('');
  };

  const handleSaveTable = async (event) => {
    event.preventDefault();
    setTableFormError('');

    const tableNumber = tableForm.table_number.trim();
    const floor = tableForm.floor.trim() || 'Main Floor';
    const capacity = Number(tableForm.capacity);

    if (!tableNumber) {
      setTableFormError('Enter a table number.');
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      setTableFormError('Capacity must be a whole number greater than zero.');
      return;
    }

    const duplicate = tables.some(
      (table) =>
        String(table.id) !== String(editingTable?.id) &&
        String(table.table_number || '').trim().toLowerCase() ===
          tableNumber.toLowerCase()
    );

    if (duplicate) {
      setTableFormError('A table with this number already exists.');
      return;
    }

    setIsSavingTable(true);

    try {
      const values = { table_number: tableNumber, floor, capacity };

      if (editingTable) {
        try {
          await api.put(`/restaurant/tables/${editingTable.id}`, values);
        } catch (error) {
          if (![404, 405].includes(error.response?.status)) throw error;
          await api.patch(`/restaurant/tables/${editingTable.id}`, values);
        }

        saveLocalTableOverride(editingTable.id, values);
      } else {
        await api.post('/restaurant/tables', values);
      }

      await fetchTables();
      setIsTableModalOpen(false);
      setEditingTable(null);
    } catch (error) {
      console.error('Failed to save restaurant table:', error);
      setTableFormError(
        error.response?.data?.detail ||
          'Failed to save table. Please try again.'
      );
    } finally {
      setIsSavingTable(false);
    }
  };

  const toggleMergeTableSelection = (tableId) => {
    const id = String(tableId);

    setSelectedMergeTableIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  };

  const handleMergeTables = async (event) => {
    event.preventDefault();
    setMergeTableError('');

    const selectedTables = tables.filter((table) =>
      selectedMergeTableIds.includes(String(table.id))
    );

    if (selectedTables.length < 2) {
      setMergeTableError('Select at least two tables to merge.');
      return;
    }

    setIsMergingTables(true);

    try {
      await api.post('/restaurant/tables/merge', {
        table_ids: selectedTables.map((table) => table.id)
      });

      setIsMergeModalOpen(false);
      setSelectedMergeTableIds([]);
      await fetchTables();
    } catch (error) {
      console.error('Failed to merge restaurant tables:', error);
      setMergeTableError(
        error.response?.data?.detail ||
          'Failed to merge tables. Please try again.'
      );
    } finally {
      setIsMergingTables(false);
    }
  };

  const handleDeleteTable = async (table) => {
    if (
      !window.confirm(
        `Delete ${table.table_number}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingTableId(String(table.id));

    try {
      await api.delete(`/restaurant/tables/${table.id}`);
      removeLocalTableOverride(table.id);
      await fetchTables();
    } catch (error) {
      console.error('Failed to delete restaurant table:', error);
      window.alert(
        error.response?.data?.detail ||
          `Failed to delete ${table.table_number}. Please try again.`
      );
    } finally {
      setDeletingTableId(null);
    }
  };

  const toggleTableStatus = async (group) => {
    const currentStatus = String(
      group.members[0]?.status || 'FREE'
    ).toUpperCase();

    const nextStatus =
      currentStatus === 'FREE'
        ? 'OCCUPIED'
        : currentStatus === 'OCCUPIED'
          ? 'BILLING'
          : 'FREE';

    setUpdatingTableStatusId(group.id);

    try {
      await Promise.all(
        group.members.map((table) =>
          api.put(`/restaurant/tables/${table.id}/status`, {
            status: nextStatus
          })
        )
      );

      await fetchTables();
    } catch (error) {
      console.error('Failed to update table status:', error);
      window.alert(
        error.response?.data?.detail || 'Failed to update table status.'
      );
    } finally {
      setUpdatingTableStatusId(null);
    }
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Restaurant Table Floor Plan
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View occupancy, manage joined tables, and track service timings.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleTableSort('capacity')}
            aria-pressed={sortMode.key === 'capacity'}
            className={sortButtonClass('capacity')}
          >
            <Users className="h-4 w-4" />
            Capacity{sortArrow('capacity')}
          </button>

          <button
            type="button"
            onClick={() => handleTableSort('time')}
            aria-pressed={sortMode.key === 'time'}
            className={sortButtonClass('time')}
          >
            <Clock className="h-4 w-4" />
            Service Time{sortArrow('time')}
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMergeTableIds([]);
              setMergeTableError('');
              setIsMergeModalOpen(true);
            }}
            disabled={mergeableTables.length < 2}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
            Merge Tables
          </button>

          <button
            type="button"
            onClick={openAddTableModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Table
          </button>
        </div>
      </header>

      {tableError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <span>{tableError}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchTables();
            }}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
          Loading tables…
        </div>
      ) : tables.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
          <p className="font-bold text-slate-700">No tables configured</p>
          <p className="mt-1 text-sm text-slate-500">
            Select Add Table to create your first table.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayGroups.map((group) => {
            const members = group.members;
            const firstTable = members[0];
            const isMerged = Boolean(group.mergeGroupId);
            const isFree = members.every(
              (table) => String(table.status || 'FREE').toUpperCase() === 'FREE'
            );
            const isOccupied = members.some(
              (table) => String(table.status || '').toUpperCase() === 'OCCUPIED'
            );
            const capacity = members.reduce(
              (sum, table) => sum + (Number(table.capacity) || 0),
              0
            );

            return (
              <article
                key={group.id}
                className={`flex flex-col justify-between rounded-2xl border-2 p-5 ${
                  isFree
                    ? 'border-slate-200 bg-white hover:border-emerald-400'
                    : isOccupied
                      ? 'border-amber-400 bg-amber-50/60'
                      : 'border-indigo-400 bg-indigo-50/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900">
                          {isMerged ? 'Joined Tables' : firstTable.table_number}
                        </h2>
                        {isMerged && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-800">
                            <Link2 className="h-3 w-3" />
                            MERGED
                          </span>
                        )}
                      </div>

                      {isMerged && (
                        <p className="mt-1 text-sm font-semibold text-indigo-700">
                          {members.map((table) => table.table_number).join(' + ')}
                        </p>
                      )}
                    </div>

                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                      {isFree ? 'FREE' : isOccupied ? 'OCCUPIED' : 'BILLING'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <Users className="h-4 w-4" />
                    {firstTable.floor || 'Main Floor'} · Capacity: {capacity} Guests
                  </div>

                  {members.map((table) => (
                    <div
                      key={table.id}
                      className="mt-3 border-t border-slate-200/70 pt-3"
                    >
                      {isMerged && (
                        <p className="mb-1 text-xs font-bold text-slate-700">
                          {table.table_number}
                        </p>
                      )}

                      {table.active_order && (
                        <p className="mb-2 text-xs font-bold text-amber-700">
                          Active order: {table.active_order}
                        </p>
                      )}

                      <TableServiceTimer
                        table={table}
                        onUpdated={updateTableInState}
                        onReset={handleResetTableTimer}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-5 space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleTableStatus(group)}
                    disabled={updatingTableStatusId === group.id}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-white disabled:opacity-50"
                  >
                    {updatingTableStatusId === group.id
                      ? 'Updating…'
                      : `Change ${isMerged ? 'Group' : 'Table'}: ${
                          isFree
                            ? 'Mark Occupied'
                            : isOccupied
                              ? 'Mark Billing'
                              : 'Free'
                        }`}
                  </button>

                  {!isMerged && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditTableModal(firstTable)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-white py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTable(firstTable)}
                        disabled={deletingTableId === String(firstTable.id)}
                        aria-label={`Delete ${firstTable.table_number}`}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-3 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isTableModalOpen}
        onClose={closeTableModal}
        title={editingTable ? `Edit ${editingTable.table_number}` : 'Add Table'}
        size="sm"
      >
        <form onSubmit={handleSaveTable} className="space-y-4">
          {tableFormError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            >
              {tableFormError}
            </p>
          )}

          <label className="block text-xs font-bold text-slate-700">
            Table Number
            <input
              name="table_number"
              value={tableForm.table_number}
              onChange={(event) =>
                setTableForm((form) => ({
                  ...form,
                  table_number: event.target.value
                }))
              }
              placeholder="T-1"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>

          <label className="block text-xs font-bold text-slate-700">
            Floor / Area
            <input
              name="floor"
              value={tableForm.floor}
              onChange={(event) =>
                setTableForm((form) => ({
                  ...form,
                  floor: event.target.value
                }))
              }
              placeholder="Main Floor"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>

          <label className="block text-xs font-bold text-slate-700">
            Guest Capacity
            <input
              name="capacity"
              type="number"
              min="1"
              step="1"
              value={tableForm.capacity}
              onChange={(event) =>
                setTableForm((form) => ({
                  ...form,
                  capacity: event.target.value
                }))
              }
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={closeTableModal}
              disabled={isSavingTable}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingTable}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {editingTable ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isSavingTable
                ? 'Saving…'
                : editingTable
                  ? 'Save Changes'
                  : 'Add Table'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isMergeModalOpen}
        onClose={() => {
          if (isMergingTables) return;
          setIsMergeModalOpen(false);
          setSelectedMergeTableIds([]);
          setMergeTableError('');
        }}
        title="Merge Restaurant Tables"
        size="sm"
      >
        <form onSubmit={handleMergeTables} className="space-y-4">
          <p className="text-sm text-slate-600">
            Select two or more free, unmerged tables to join together.
          </p>

          {mergeTableError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            >
              {mergeTableError}
            </p>
          )}

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {mergeableTables.map((table) => (
              <label
                key={table.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
              >
                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    {table.table_number}
                  </span>
                  <span className="text-xs text-slate-500">
                    {table.floor || 'Main Floor'} · Capacity: {table.capacity}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={selectedMergeTableIds.includes(String(table.id))}
                  onChange={() => toggleMergeTableSelection(table.id)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
              </label>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            {selectedMergeTableIds.length} selected
          </p>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => {
                if (isMergingTables) return;
                setIsMergeModalOpen(false);
              }}
              disabled={isMergingTables}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isMergingTables || selectedMergeTableIds.length < 2}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />
              {isMergingTables ? 'Merging…' : 'Merge Selected'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
};

/* ---------------------------- Kitchen page ------------------------------- */

export const KitchenOperations = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const resolveView = useCallback(() => {
    const queryView = searchParams.get('view');
    if (queryView === 'active' || queryView === 'history') return queryView;

    const navigationView = location.state?.view;
    if (navigationView === 'active' || navigationView === 'history') {
      return navigationView;
    }

    return 'active';
  }, [searchParams, location.state]);

  const [view, setView] = useState(resolveView);

  useEffect(() => {
    const nextView = resolveView();
    setView((current) => (current === nextView ? current : nextView));
  }, [resolveView]);

  const [activeKots, setActiveKots] = useState([]);
  const [historyKots, setHistoryKots] = useState([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [now, setNow] = useState(Date.now());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  const fetchActiveKots = useCallback(async (silent = false) => {
    if (!silent) setLoadingActive(true);

    try {
      const response = await api.get('/restaurant/kds');
      setActiveKots(getTicketList(response.data));
      setError('');
    } catch (requestError) {
      console.error('Failed to load active kitchen queue:', requestError);
      setError(
        requestError.response?.data?.detail ||
          'Could not load the active kitchen queue.'
      );
    } finally {
      setLoadingActive(false);
    }
  }, []);

  const fetchHistoryKots = useCallback(async () => {
    setLoadingHistory(true);

    try {
      const response = await api.get('/restaurant/kds/history');
      setHistoryKots(getTicketList(response.data));
      setError('');
    } catch (requestError) {
      console.error('Failed to load kitchen history:', requestError);
      setError(
        requestError.response?.data?.detail ||
          'Could not load saved kitchen history.'
      );
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'active') {
      fetchActiveKots();

      const pollId = window.setInterval(() => fetchActiveKots(true), 5000);
      const clockId = window.setInterval(() => setNow(Date.now()), 30000);

      return () => {
        window.clearInterval(pollId);
        window.clearInterval(clockId);
      };
    }

    fetchHistoryKots();
    return undefined;
  }, [view, fetchActiveKots, fetchHistoryKots]);

  const handleViewChange = (nextView) => {
    if (nextView !== 'active' && nextView !== 'history') return;

    setView(nextView);
    setError('');
    setSearchParams({ view: nextView });
  };

  const updateKOTStatus = async (kot, nextStatus) => {
    setUpdatingId(String(kot.id));
    setError('');

    try {
      await api.put(`/restaurant/kot/${kot.id}/status`, {
        status: nextStatus
      });

      if (nextStatus === 'SERVED') {
        setActiveKots((current) =>
          current.filter((item) => String(item.id) !== String(kot.id))
        );
      } else {
        setActiveKots((current) =>
          current.map((item) =>
            String(item.id) === String(kot.id)
              ? { ...item, status: nextStatus }
              : item
          )
        );
      }
    } catch (requestError) {
      console.error('Failed to update kitchen ticket:', requestError);
      setError(
        requestError.response?.data?.detail ||
          `Could not update ${kot.kot_number || 'the kitchen ticket'}.`
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const activeCounts = useMemo(
    () => ({
      PENDING: activeKots.filter(
        (kot) => String(kot.status || '').toUpperCase() === 'PENDING'
      ).length,
      COOKING: activeKots.filter(
        (kot) => String(kot.status || '').toUpperCase() === 'COOKING'
      ).length,
      READY: activeKots.filter(
        (kot) => String(kot.status || '').toUpperCase() === 'READY'
      ).length
    }),
    [activeKots]
  );

  const filteredHistoryKots = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return historyKots.filter((kot) => {
      if (
        statusFilter !== 'ALL' &&
        String(kot.status || '').toUpperCase() !== statusFilter
      ) {
        return false;
      }

      if (dateFilter) {
        const createdAt = kot.created_at ? new Date(kot.created_at) : null;

        if (
          !createdAt ||
          Number.isNaN(createdAt.getTime()) ||
          getLocalDateString(createdAt) !== dateFilter
        ) {
          return false;
        }
      }

      if (!query) return true;

      const itemMatch = (Array.isArray(kot.items) ? kot.items : []).some(
        (item) =>
          `${item.name || ''} ${item.item_name || ''}`
            .toLowerCase()
            .includes(query)
      );

      const textMatch = [
        kot.kot_number,
        kot.table_number,
        kot.waiter_name,
        kot.notes,
        kot.order_type
      ].some((value) => String(value || '').toLowerCase().includes(query));

      return textMatch || itemMatch;
    });
  }, [historyKots, statusFilter, dateFilter, searchQuery]);

  const refreshCurrentView = () => {
    if (view === 'active') {
      fetchActiveKots();
    } else {
      fetchHistoryKots();
    }
  };

  const currentLoading = view === 'active' ? loadingActive : loadingHistory;
  const hasHistoryFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== 'ALL' ||
    Boolean(dateFilter);

  const clearHistoryFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setDateFilter('');
  };

  const today = getLocalDateString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateString(yesterdayDate);

  return (
    <main className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
            <Flame className="h-4 w-4 text-amber-600" />
            Kitchen Operations
            {view === 'active' && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            )}
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {view === 'active' ? 'Active Chef Order Queue' : 'KOT History'}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {view === 'active'
              ? 'Real-time tickets currently in preparation.'
              : 'Search and review saved kitchen tickets and status history.'}
          </p>
        </div>

        <button
          type="button"
          onClick={refreshCurrentView}
          disabled={currentLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${currentLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </header>

      <nav
        className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-1.5"
        aria-label="Kitchen views"
      >
        <button
          type="button"
          onClick={() => handleViewChange('active')}
          aria-current={view === 'active' ? 'page' : undefined}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
            view === 'active'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
          }`}
        >
          <ListTodo className="h-4 w-4" />
          Active Queue
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {activeKots.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleViewChange('history')}
          aria-current={view === 'history' ? 'page' : undefined}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
            view === 'history'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
          }`}
        >
          <History className="h-4 w-4" />
          KOT History
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
            {historyKots.length}
          </span>
        </button>
      </nav>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={refreshCurrentView}
            className="font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      {view === 'active' ? (
        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              ['Pending Orders', activeCounts.PENDING, 'text-amber-900', 'bg-amber-50'],
              ['Cooking Now', activeCounts.COOKING, 'text-indigo-900', 'bg-indigo-50'],
              ['Ready to Serve', activeCounts.READY, 'text-emerald-900', 'bg-emerald-50']
            ].map(([label, count, textClass, bgClass]) => (
              <div
                key={label}
                className={`rounded-2xl border border-slate-200 p-4 ${bgClass}`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  {label}
                </p>
                <p className={`mt-2 text-3xl font-black ${textClass}`}>{count}</p>
              </div>
            ))}
          </div>

          {loadingActive ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
              <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm font-bold text-slate-700">
                Loading active kitchen orders…
              </p>
            </div>
          ) : activeKots.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
              <ChefHat className="mx-auto mb-3 h-14 w-14 text-slate-300" />
              <h2 className="text-lg font-bold text-slate-800">
                No Active Kitchen Tickets
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                New tickets appear here when the POS creates a kitchen order.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {activeKots.map((kot) => {
                const status = String(kot.status || 'PENDING').toUpperCase();
                const action = getNextAction(status);
                const items = Array.isArray(kot.items) ? kot.items : [];

                return (
                  <article
                    key={kot.id}
                    className="flex min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <header className="flex items-start justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-slate-50/50 p-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-black text-indigo-700">
                            {kot.kot_number || 'KOT'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {kot.order_type || 'Dine-in'}
                          </span>
                        </div>
                        <h2 className="mt-1.5 text-xl font-black text-slate-900">
                          {kot.table_number ? `Table ${kot.table_number}` : 'Order'}
                        </h2>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                          Elapsed: {formatElapsed(kot.created_at, now)}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${getStatusClasses(status)}`}>
                        {status}
                      </span>
                    </header>

                    <div className="flex-1 space-y-4 p-5">
                      {kot.notes && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                          <strong>Instructions: </strong>
                          {kot.notes}
                        </div>
                      )}

                      <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Dishes to Prepare ({items.length})
                        </p>
                        {items.length > 0 ? (
                          <ul className="divide-y divide-slate-100">
                            {items.map((item, index) => (
                              <li
                                key={item.id || `${item.name || 'item'}-${index}`}
                                className="flex items-center justify-between gap-3 py-2.5"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-900">
                                    {item.name || item.item_name || 'Dish item'}
                                  </p>
                                  {item.notes && (
                                    <p className="mt-0.5 text-xs italic text-amber-700">
                                      Note: {item.notes}
                                    </p>
                                  )}
                                </div>
                                <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-black text-slate-800">
                                  ×{item.quantity ?? 1}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs italic text-slate-400">
                            No food items listed on this ticket.
                          </p>
                        )}
                      </div>

                      {kot.waiter_name && (
                        <p className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                          Server / Waiter:{' '}
                          <strong className="text-slate-700">{kot.waiter_name}</strong>
                        </p>
                      )}
                    </div>

                    {action && (
                      <footer className="rounded-b-2xl border-t border-slate-100 bg-slate-50/30 p-4">
                        <button
                          type="button"
                          onClick={() => updateKOTStatus(kot, action.nextStatus)}
                          disabled={updatingId === String(kot.id)}
                          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                        >
                          {updatingId === String(kot.id)
                            ? 'Updating Ticket…'
                            : action.label}
                        </button>
                      </footer>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search KOT, table, waiter, dish…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <label className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ALL">All statuses ({historyKots.length})</option>
                  <option value="PENDING">Pending</option>
                  <option value="COOKING">Cooking</option>
                  <option value="READY">Ready</option>
                  <option value="SERVED">Served</option>
                </select>
              </label>

              <label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  aria-label="Filter history by creation date"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-400">Date:</span>
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className={`rounded-lg px-2.5 py-1 font-bold ${
                    !dateFilter
                      ? 'border border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All dates
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter(today)}
                  className={`rounded-lg px-2.5 py-1 font-bold ${
                    dateFilter === today
                      ? 'border border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter(yesterday)}
                  className={`rounded-lg px-2.5 py-1 font-bold ${
                    dateFilter === yesterday
                      ? 'border border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Yesterday
                </button>
              </div>

              {hasHistoryFilters && (
                <div className="flex items-center gap-2 text-slate-500">
                  <span>
                    Showing <strong>{filteredHistoryKots.length}</strong> of{' '}
                    {historyKots.length}
                  </span>
                  <button
                    type="button"
                    onClick={clearHistoryFilters}
                    className="inline-flex items-center gap-1 font-bold text-rose-600 hover:text-rose-700"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {loadingHistory ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
              <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm font-bold text-slate-700">
                Loading KOT history…
              </p>
            </div>
          ) : filteredHistoryKots.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
              <History className="mx-auto mb-3 h-14 w-14 text-slate-300" />
              <h2 className="text-lg font-bold text-slate-800">
                {hasHistoryFilters ? 'No Matching KOTs' : 'No Saved Kitchen History'}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {hasHistoryFilters
                  ? 'Try changing or clearing the search and filters.'
                  : 'Saved kitchen tickets appear here after the POS creates them.'}
              </p>
              {hasHistoryFilters && (
                <button
                  type="button"
                  onClick={clearHistoryFilters}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredHistoryKots.map((kot) => {
                const status = String(kot.status || 'UNKNOWN').toUpperCase();
                const items = Array.isArray(kot.items) ? kot.items : [];
                const timeline = Array.isArray(kot.status_history)
                  ? kot.status_history
                  : [];

                return (
                  <article
                    key={kot.id}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <header className="flex items-start justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-slate-50/50 p-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-black text-indigo-700">
                            {kot.kot_number || 'KOT'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {kot.order_type || 'Dine-in'}
                          </span>
                        </div>
                        <h2 className="mt-1.5 text-xl font-black text-slate-900">
                          {kot.table_number ? `Table ${kot.table_number}` : 'Order'}
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                          Created: {formatDateTime(kot.created_at)}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${getStatusClasses(status)}`}>
                        {status}
                      </span>
                    </header>

                    <div className="flex-1 space-y-4 p-5">
                      {kot.notes && (
                        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                          <strong>Notes: </strong>
                          {kot.notes}
                        </p>
                      )}

                      <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Dishes ({items.length})
                        </p>
                        {items.length > 0 ? (
                          <ul className="divide-y divide-slate-100">
                            {items.map((item, index) => (
                              <li
                                key={item.id || `${item.name || 'item'}-${index}`}
                                className="flex items-center justify-between gap-3 py-2"
                              >
                                <span className="text-sm font-semibold text-slate-800">
                                  {item.name || item.item_name || 'Dish'}
                                  {item.notes && (
                                    <span className="mt-0.5 block text-xs italic text-slate-500">
                                      Note: {item.notes}
                                    </span>
                                  )}
                                </span>
                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                                  ×{item.quantity ?? 1}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs italic text-slate-400">
                            No food items listed.
                          </p>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-3">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Preparation Timeline
                        </p>
                        {timeline.length > 0 ? (
                          <ol className="space-y-1.5">
                            {timeline.map((entry, index) => (
                              <li
                                key={`${entry.status}-${entry.changed_at || index}`}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="font-bold text-slate-700">
                                  {String(entry.status || '').replaceAll('_', ' ')}
                                </span>
                                <time className="font-mono text-[11px] text-slate-400">
                                  {formatDateTime(entry.changed_at)}
                                </time>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-xs italic text-slate-400">
                            No transition timestamps recorded.
                          </p>
                        )}
                      </div>

                      {kot.waiter_name && (
                        <p className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                          Waiter:{' '}
                          <strong className="text-slate-700">{kot.waiter_name}</strong>
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
};

export { KitchenOperations as KitchenDisplay };
export default KitchenOperations;