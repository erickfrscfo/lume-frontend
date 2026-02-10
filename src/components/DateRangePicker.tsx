import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string; // formato YYYY-MM-DD
  endDate: string;
  onChangeStart: (date: string) => void;
  onChangeEnd: (date: string) => void;
  onApply: () => void;
  onClear: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function MiniCalendar({
  selectedDate,
  onSelect,
  minDate,
  maxDate,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  minDate?: string;
  maxDate?: string;
}) {
  const today = new Date();
  const sel = selectedDate ? new Date(selectedDate + 'T00:00:00') : today;
  const [viewYear, setViewYear] = useState(sel.getFullYear());
  const [viewMonth, setViewMonth] = useState(sel.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isDisabled = (day: number) => {
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const isSelected = (day: number) => {
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return d === selectedDate;
  };

  const isToday = (day: number) => {
    return viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
  };

  const handleSelect = (day: number) => {
    if (isDisabled(day)) return;
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelect(d);
  };

  return (
    <div className="w-64">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const disabled = isDisabled(day);
          const selected = isSelected(day);
          const todayMark = isToday(day);
          return (
            <button
              key={day}
              onClick={() => handleSelect(day)}
              disabled={disabled}
              className={`
                h-8 w-full text-xs rounded-md transition-all
                ${disabled ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}
                ${selected ? 'bg-blue-600 text-white hover:bg-blue-700 font-semibold' : ''}
                ${todayMark && !selected ? 'font-bold text-blue-600 ring-1 ring-blue-300' : ''}
                ${!selected && !disabled && !todayMark ? 'text-slate-700' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  onApply,
  onClear,
}: DateRangePickerProps) {
  const [showCalendar, setShowCalendar] = useState<'start' | 'end' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar calendário ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowCalendar(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formatar data para exibição no input (DD/MM/AAAA)
  const formatForDisplay = (isoDate: string) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };

  // Parsear input digitado (DD/MM/AAAA) para ISO (YYYY-MM-DD)
  const parseInput = (value: string): string => {
    // Aceitar formatos: DD/MM/AAAA, DD-MM-AAAA, DDMMAAAA
    const cleaned = value.replace(/[^\d]/g, '');
    if (cleaned.length === 8) {
      const d = cleaned.slice(0, 2);
      const m = cleaned.slice(2, 4);
      const y = cleaned.slice(4, 8);
      const day = parseInt(d), month = parseInt(m), year = parseInt(y);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
        return `${y}-${m}-${d}`;
      }
    }
    return '';
  };

  // Auto-formatar enquanto digita
  const handleInputChange = (value: string, field: 'start' | 'end') => {
    // Remover tudo que não é número
    let digits = value.replace(/[^\d]/g, '');
    
    // Limitar a 8 dígitos
    digits = digits.slice(0, 8);
    
    // Auto-inserir barras
    let formatted = '';
    if (digits.length > 0) formatted = digits.slice(0, 2);
    if (digits.length > 2) formatted += '/' + digits.slice(2, 4);
    if (digits.length > 4) formatted += '/' + digits.slice(4, 8);

    // Se completou 8 dígitos, parsear e salvar
    if (digits.length === 8) {
      const iso = parseInput(digits);
      if (iso) {
        if (field === 'start') onChangeStart(iso);
        else onChangeEnd(iso);
        return;
      }
    }

    // Se está apagando ou incompleto, limpar o valor ISO
    if (digits.length < 8) {
      if (field === 'start') onChangeStart('');
      else onChangeEnd('');
    }
  };

  // Atalhos rápidos
  const setPreset = (preset: string) => {
    const now = new Date();
    const toISO = (d: Date) => d.toISOString().split('T')[0];
    
    switch (preset) {
      case 'thisMonth': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        onChangeStart(toISO(start));
        onChangeEnd(toISO(end));
        break;
      }
      case 'lastMonth': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        onChangeStart(toISO(start));
        onChangeEnd(toISO(end));
        break;
      }
      case 'last3Months': {
        const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        onChangeStart(toISO(start));
        onChangeEnd(toISO(end));
        break;
      }
      case 'last6Months': {
        const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        onChangeStart(toISO(start));
        onChangeEnd(toISO(end));
        break;
      }
      case 'thisYear': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        onChangeStart(toISO(start));
        onChangeEnd(toISO(end));
        break;
      }
    }
    setShowCalendar(null);
  };

  const hasFilter = startDate || endDate;

  return (
    <div ref={containerRef} className="relative flex items-center gap-2 flex-wrap">
      {/* Input Data Início */}
      <div className="relative">
        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
          <input
            type="text"
            placeholder="DD/MM/AAAA"
            value={startDate ? formatForDisplay(startDate) : ''}
            onChange={(e) => handleInputChange(e.target.value, 'start')}
            className="w-[110px] text-sm px-3 py-1.5 focus:outline-none"
          />
          <button
            onClick={() => setShowCalendar(showCalendar === 'start' ? null : 'start')}
            className="px-2 py-1.5 hover:bg-slate-50 border-l border-slate-200 transition-colors"
          >
            <Calendar className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Calendário popup início */}
        {showCalendar === 'start' && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50">
            <MiniCalendar
              selectedDate={startDate}
              onSelect={(d) => { onChangeStart(d); setShowCalendar('end'); }}
              maxDate={endDate || undefined}
            />
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 mb-2 font-medium uppercase tracking-wider">Atalhos</p>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'Este mês', key: 'thisMonth' },
                  { label: 'Mês passado', key: 'lastMonth' },
                  { label: 'Últimos 3m', key: 'last3Months' },
                  { label: 'Últimos 6m', key: 'last6Months' },
                  { label: 'Este ano', key: 'thisYear' },
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPreset(p.key)}
                    className="text-[11px] px-2 py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-md text-slate-600 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <span className="text-sm text-slate-400">até</span>

      {/* Input Data Fim */}
      <div className="relative">
        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
          <input
            type="text"
            placeholder="DD/MM/AAAA"
            value={endDate ? formatForDisplay(endDate) : ''}
            onChange={(e) => handleInputChange(e.target.value, 'end')}
            className="w-[110px] text-sm px-3 py-1.5 focus:outline-none"
          />
          <button
            onClick={() => setShowCalendar(showCalendar === 'end' ? null : 'end')}
            className="px-2 py-1.5 hover:bg-slate-50 border-l border-slate-200 transition-colors"
          >
            <Calendar className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Calendário popup fim */}
        {showCalendar === 'end' && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50">
            <MiniCalendar
              selectedDate={endDate}
              onSelect={(d) => { onChangeEnd(d); setShowCalendar(null); }}
              minDate={startDate || undefined}
            />
          </div>
        )}
      </div>

      {/* Botão Filtrar */}
      <button
        onClick={() => { onApply(); setShowCalendar(null); }}
        disabled={!startDate || !endDate}
        className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
      >
        Filtrar
      </button>

      {/* Botão Limpar */}
      {hasFilter && (
        <button
          onClick={() => { onClear(); setShowCalendar(null); }}
          className="text-sm px-2 py-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Limpar filtro de datas"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
