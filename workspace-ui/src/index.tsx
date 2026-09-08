'use client';
import * as React from 'react';
import {createPortal} from 'react-dom';
import { Dialog as D, Popover as P, Tabs as T, Switch as S, Tooltip as Tip, Select as Dropdown, DropdownMenu as Menu, ToggleGroup as G } from 'radix-ui';
import { X, LoaderCircle, Search, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { defaultTheme, themeColors, type Theme } from './theme';
export { defaultTheme, themeColors, contrast, physicalIOBrand, minimalTheme } from './theme';
export type { Theme } from './theme';
const ToastContext = React.createContext<HTMLDivElement | null>(null);
const PortalContext = React.createContext<HTMLElement | null>(null);
const cx = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(' ');
export function ThemeProvider({ theme = defaultTheme, children }: { theme?: Theme; children: React.ReactNode }) {
  const [root, setRoot] = React.useState<HTMLDivElement | null>(null);
  const [toastRoot,setToastRoot]=React.useState<HTMLDivElement|null>(null);
  const colors = themeColors(theme.palette === 'minimal' ? '#171717' : theme.accent);
  return <PortalContext.Provider value={root}><div ref={setRoot} className="wui" data-palette={theme.palette ?? 'brand'} data-mode={theme.mode} data-font={theme.font} data-density={theme.density} data-hierarchy={theme.hierarchy} style={{ '--ui-action': colors.action, '--ui-action-hover': colors.actionHover, '--ui-on-action': colors.onAction, '--ui-accent': colors.accent, '--ui-on-accent': colors.onAccent } as React.CSSProperties}><ToastContext.Provider value={toastRoot}>{children}<div ref={setToastRoot} className="ui-toast-viewport" aria-label="Notifications"/></ToastContext.Provider></div></PortalContext.Provider>;
}
export function Button({ variant = 'secondary', busy, children, className, disabled, ...props }: React.ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; busy?: boolean }) {
  return <button type="button" {...props} disabled={disabled || busy} aria-busy={busy || undefined} className={cx('ui-button', `ui-button-${variant}`, className)}>{busy && <LoaderCircle aria-hidden className="ui-spin" size={16}/ >}{children}</button>;
}
export function IconButton({ label, children, ...props }: Omit<React.ComponentProps<typeof Button>, 'aria-label'> & { label: string }) { return <Button {...props} aria-label={label} className={cx('ui-icon-button', props.className)}>{children}</Button>; }
export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'warning' | 'danger'; children: React.ReactNode }) { return <span className={`ui-badge ui-${tone}`}><span aria-hidden className="ui-dot"/>{children}</span>; }
export function Avatar({name,src}:{name:string;src?:string|null}){const [failed,setFailed]=React.useState(false);React.useEffect(()=>setFailed(false),[src]);return <span className="ui-avatar" aria-hidden>{src&&!failed?<img src={src} alt="" onError={()=>setFailed(true)}/>:name.trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'?'}</span>;}
export function Field({ label, hint, error, id, ...props }: React.ComponentProps<'input'> & { label: string; hint?: string; error?: string }) {
  const generated = React.useId(); const fieldId = id ?? generated;
  const [rangeValue,setRangeValue]=React.useState(props.defaultValue??50);
  const rangeMin=Number(props.min??0),rangeMax=Number(props.max??100);
  const progress=Math.max(0,Math.min(100,(Number(props.value??rangeValue)-rangeMin)/(rangeMax-rangeMin||1)*100));
  const rangeProps=props.type==='range'?{style:{...props.style,'--ui-range-progress':`${progress}%`} as React.CSSProperties,onChange:(event:React.ChangeEvent<HTMLInputElement>)=>{setRangeValue(event.target.value);props.onChange?.(event);}}:{};
  return <div className="ui-field"><label htmlFor={fieldId}>{label}</label><input {...props} {...rangeProps} id={fieldId} className={cx('ui-input', props.className)} aria-invalid={!!error} aria-describedby={error || hint ? `${fieldId}-help` : undefined}/>{(hint || error) && <small id={`${fieldId}-help`} className={error ? 'ui-error' : ''}>{error ?? hint}</small>}</div>;
}
/** Multiline field with the same label, help and error contract as Field. */
export function TextArea({ label, hint, error, id, ...props }: React.ComponentProps<'textarea'> & { label: string; hint?: string; error?: string }) {
  const generated = React.useId(); const fieldId = id ?? generated;
  return <div className="ui-field"><label htmlFor={fieldId}>{label}</label><textarea {...props} id={fieldId} className={cx('ui-input', props.className)} aria-invalid={!!error} aria-describedby={error || hint ? `${fieldId}-help` : undefined}/>{(hint || error) && <small id={`${fieldId}-help`} className={error ? 'ui-error' : ''}>{error ?? hint}</small>}</div>;
}
export type SelectProps = React.ComponentProps<typeof Dropdown.Root> & {
  label: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  id?: string;
  className?: string;
};
export function Select({ label, options, placeholder = 'Choose an option', id, className, ...props }: SelectProps) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const container = React.useContext(PortalContext);
  return (
    <div className="ui-field">
      <label htmlFor={fieldId}>{label}</label>
      <Dropdown.Root {...props}>
        <Dropdown.Trigger id={fieldId} className={cx('ui-input', 'ui-select-trigger', className)}>
          <Dropdown.Value placeholder={placeholder} />
          <Dropdown.Icon className="ui-select-chevron"><ChevronDown size={16} aria-hidden /></Dropdown.Icon>
        </Dropdown.Trigger>
        <Dropdown.Portal container={container}>
          <Dropdown.Content className="ui-select-content" position="popper" sideOffset={6} collisionPadding={12}>
            <Dropdown.ScrollUpButton className="ui-select-scroll"><ChevronUp size={15} aria-hidden /></Dropdown.ScrollUpButton>
            <Dropdown.Viewport className="ui-select-viewport">
              {options.map(option => (
                <Dropdown.Item className="ui-select-option" key={option.value} value={option.value} disabled={option.disabled}>
                  <Dropdown.ItemText>{option.label}</Dropdown.ItemText>
                  <Dropdown.ItemIndicator className="ui-select-check"><Check size={16} aria-hidden /></Dropdown.ItemIndicator>
                </Dropdown.Item>
              ))}
            </Dropdown.Viewport>
            <Dropdown.ScrollDownButton className="ui-select-scroll"><ChevronDown size={15} aria-hidden /></Dropdown.ScrollDownButton>
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
    </div>
  );
}
export function SearchField(props: React.ComponentProps<'input'> & { label: string }) { const { label, ...rest } = props; return <label className="ui-search"><Search size={17} aria-hidden/><span className="ui-sr-only">{label}</span><input {...rest} type="search" /></label>; }
export function Switch({ label, ...props }: React.ComponentProps<typeof S.Root> & { label: string }) { const id = React.useId(); return <div className="ui-switch-field"><label htmlFor={id}>{label}</label><S.Root {...props} id={id} className="ui-switch"><S.Thumb className="ui-switch-thumb"/></S.Root></div>; }
export function Tooltip({ label, children }: { label: string; children: React.ReactElement }) { const container=React.useContext(PortalContext);return <Tip.Provider delayDuration={350}><Tip.Root><Tip.Trigger asChild>{children}</Tip.Trigger><Tip.Portal container={container}><Tip.Content className="ui-tooltip" sideOffset={6} collisionPadding={8}>{label}<Tip.Arrow/></Tip.Content></Tip.Portal></Tip.Root></Tip.Provider>; }
/** Compact, mutually exclusive view controls with accessible icon labels. */
export function ViewSwitch({value,onValueChange,label,items}:{value:string;onValueChange:(value:string)=>void;label:string;items:{value:string;label:string;icon:React.ReactNode}[]}) {
 return <G.Root type="single" className="ui-view-switch" aria-label={label} value={value} onValueChange={next=>{if(next)onValueChange(next);}}>{items.map(item=><Tooltip key={item.value} label={item.label}><G.Item value={item.value} asChild><IconButton label={item.label} variant="ghost">{item.icon}</IconButton></G.Item></Tooltip>)}</G.Root>;
}
export function Tabs({ value, onValueChange, items, label }: { value: string; onValueChange: (value: string) => void; label: string; items: { value: string; label: React.ReactNode; content: React.ReactNode }[] }) { return <T.Root value={value} onValueChange={onValueChange}><T.List className="ui-tabs" aria-label={label}>{items.map(i => <T.Trigger className="ui-tab" value={i.value} key={i.value}>{i.label}</T.Trigger>)}</T.List>{items.map(i => <T.Content className="ui-tab-content" value={i.value} key={i.value}>{i.content}</T.Content>)}</T.Root>; }
export function Popover({ trigger, title, children, closeLabel = "Close filters", side = "bottom", align = "start" }: { trigger: React.ReactElement; title: string; children: React.ReactNode; closeLabel?: string; side?: "top" | "right" | "bottom" | "left"; align?: "start" | "center" | "end" }) { return <P.Root><P.Trigger asChild>{trigger}</P.Trigger><P.Content aria-label={title} className="ui-popover" sideOffset={8} side={side} align={align}><div className="ui-popover-heading"><strong>{title}</strong><P.Close asChild><IconButton label={closeLabel} variant="ghost"><X size={17}/></IconButton></P.Close></div>{children}</P.Content></P.Root>; }
export function Dialog({ open, onOpenChange, title, description, children, kind = 'dialog' }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; children: React.ReactNode; kind?: 'dialog' | 'drawer' }) {
  const container = React.useContext(PortalContext);
  const returnFocus = React.useRef<HTMLElement | null>(null);
  return <D.Root open={open} onOpenChange={onOpenChange}><D.Portal container={container}><D.Overlay className="ui-overlay"/><D.Content className={`ui-dialog ui-${kind}`} onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement; }} onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}><header><div><D.Title>{title}</D.Title><D.Description>{description}</D.Description></div><D.Close asChild><IconButton label="Close panel" variant="ghost"><X size={18}/></IconButton></D.Close></header>{children}</D.Content></D.Portal></D.Root>;
}
export function Card({ children, className, ...props }: React.ComponentProps<'section'>) { return <section {...props} className={cx('ui-card', className)}>{children}</section>; }
export function PageHeader({ title, description, action, eyebrow }: { title: string; description: string; action?: React.ReactNode; eyebrow?: string }) { return <header className="ui-page-header"><div>{eyebrow && <div className="ui-eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{description}</p></div>{action}</header>; }
export function Toolbar({ children }: { children: React.ReactNode }) { return <div className="ui-toolbar">{children}</div>; }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <div className="ui-empty"><Search aria-hidden size={26}/><h3>{title}</h3><p>{description}</p>{action}</div>; }
export function Alert({ title, children, tone = 'neutral' }: { title: string; children: React.ReactNode; tone?: 'neutral' | 'danger' | 'success' }) { return <div className={`ui-alert ui-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}><strong>{title}</strong><p>{children}</p></div>; }
export function Skeleton({ label = 'Loading content' }: { label?: string }) { return <div className="ui-skeleton" role="status" aria-label={label}><span/><span/><span/></div>; }
export type Column<T> = { key: string; label: string; render: (row: T) => React.ReactNode };
export function DataTable<T>({ rows, columns, rowKey, label }: { rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; label: string }) { return <div className="ui-table-scroll" tabIndex={0} role="region" aria-label={`${label}, scrollable table`}><table className="ui-table"><caption className="ui-sr-only">{label}</caption><thead><tr>{columns.map(c => <th scope="col" key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={rowKey(row)}>{columns.map(c => <td key={c.key}>{c.render(row)}</td>)}</tr>)}</tbody></table></div>; }
export function WorkspaceShell({ sidebar, topbar, children }: { sidebar: React.ReactNode; topbar: React.ReactNode; children: React.ReactNode }) { return <div className="ui-shell"><a className="ui-skip" href="#workspace-main">Skip to content</a><aside className="ui-sidebar">{sidebar}</aside><div className="ui-workspace"><div className="ui-topbar">{topbar}</div><main id="workspace-main" tabIndex={-1}>{children}</main></div></div>; }
export function NavItem({ active, children, ...props }: React.ComponentProps<'button'> & { active?: boolean }) { return <button type="button" {...props} className="ui-nav-item" aria-current={active ? 'page' : undefined}>{children}</button>; }

export function ContextMenu({ trigger, label, description, items, tooltip }: {
  trigger: React.ReactElement;
  tooltip?: string;
  label: string;
  description?: string;
  items: { label: string; icon?: React.ReactNode; onSelect: () => void }[];
}) {
  const container = React.useContext(PortalContext);
  return <Menu.Root>
    {tooltip ? <Tooltip label={tooltip}><Menu.Trigger asChild>{trigger}</Menu.Trigger></Tooltip> : <Menu.Trigger asChild>{trigger}</Menu.Trigger>}
    <Menu.Portal container={container}>
      <Menu.Content className="ui-context-menu" aria-label={label} side="top" align="start" sideOffset={10} collisionPadding={12}>
        <Menu.Label className="ui-context-heading">{label}{description && <span>{description}</span>}</Menu.Label>
        <Menu.Separator className="ui-context-separator" />
        {items.map(item => <Menu.Item key={item.label} className="ui-context-item" onSelect={() => { setTimeout(item.onSelect, 0); }}>{item.icon}{item.label}</Menu.Item>)}
      </Menu.Content>
    </Menu.Portal>
  </Menu.Root>;
}

/** Short visual handoff for local workspace views; real data loading stays host-owned. */
export function useWorkspaceNavigation(initialPage: string) {
  const [page, setPage] = React.useState(initialPage);
  const [pendingPage, setPendingPage] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function navigate(nextPage: string) {
    if (timer.current) clearTimeout(timer.current);
    if (nextPage === page || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPage(nextPage);
      setPendingPage(null);
      return;
    }
    setPendingPage(nextPage);
    timer.current = setTimeout(() => {
      setPage(nextPage);
      setPendingPage(null);
      timer.current = null;
    }, 140);
  }
  return { page, pendingPage, navigate };
}
export function PageTransition({ page, pendingPage, children }: {
  page: string;
  pendingPage: string | null;
  children: React.ReactNode;
}) {
  const hasNavigated = React.useRef(false);
  React.useEffect(() => { if (pendingPage) hasNavigated.current = true; }, [pendingPage]);
  return <div className="ui-page-transition" aria-busy={!!pendingPage}>
    <span className="ui-sr-only" role="status" aria-live="polite">{pendingPage ? `Opening ${pendingPage}` : `${page} ready`}</span>
    {pendingPage && <div className="ui-page-loading" aria-hidden="true"><span/></div>}
    <div key={page} className="ui-page-scene" data-pending={!!pendingPage} data-enter={hasNavigated.current} inert={!!pendingPage}>{children}</div>
  </div>;
}


const NotificationContext=React.createContext<(message:string)=>void>(()=>{});
export const useNotification=()=>React.useContext(NotificationContext);
export function NotificationProvider({children}:{children:React.ReactNode}){
 const container=React.useContext(PortalContext);
 const [notices,setNotices]=React.useState<{id:number;message:string}[]>([]);
 const timers=React.useRef(new Map<number,ReturnType<typeof setTimeout>>());
 const sequence=React.useRef(0);
 const dismiss=React.useCallback((id:number)=>{clearTimeout(timers.current.get(id));timers.current.delete(id);setNotices(items=>items.filter(item=>item.id!==id));},[]);
 const notify=React.useCallback((message:string)=>{
  if(!message)return;
  const id=++sequence.current;
  setNotices(items=>[...items.filter(item=>item.message!==message).slice(-2),{id,message}]);
  timers.current.set(id,setTimeout(()=>dismiss(id),8000));
 },[dismiss]);
 React.useEffect(()=>()=>{timers.current.forEach(clearTimeout);timers.current.clear();},[]);
 return <NotificationContext.Provider value={notify}>{children}{container&&createPortal(<div className="ui-notifications" aria-live="polite" aria-relevant="additions">{notices.map(item=><div className="ui-notification" key={item.id}><span>{item.message}</span><IconButton label="Dismiss notification" variant="ghost" onClick={()=>dismiss(item.id)}><X size={16}/></IconButton></div>)}</div>,container)}</NotificationContext.Provider>;
}

/** Compact colour swatch with keyboard-editable hexadecimal value. */
export function ColorField({label,value,onValueChange}:{label:string;value:string;onValueChange:(value:string)=>void}) {
 const id=React.useId(),[draft,setDraft]=React.useState(value.toUpperCase()),[invalid,setInvalid]=React.useState(false);
 React.useEffect(()=>{setDraft(value.toUpperCase());setInvalid(false);},[value]);
 function commit(raw:string){let hex=raw.trim().replace(/^#/,'');if(/^[\da-f]{3}$/i.test(hex))hex=hex.split('').map(c=>c+c).join('');if(!/^[\da-f]{6}$/i.test(hex)){setInvalid(true);return;}const next=`#${hex.toUpperCase()}`;setDraft(next);setInvalid(false);if(next.toLowerCase()!==value.toLowerCase())onValueChange(next);}
 return <div className="ui-color-field ui-field"><label htmlFor={id}>{label}</label><div className="ui-color-row"><input className="ui-color-swatch" type="color" aria-label={`Choose ${label.toLowerCase()}`} value={value} onChange={e=>commit(e.target.value)}/><input id={id} className="ui-input ui-color-hex" aria-label={`${label} hex code`} aria-invalid={invalid||undefined} aria-describedby={invalid?`${id}-error`:undefined} value={draft} maxLength={7} spellCheck={false} autoComplete="off" onChange={e=>{setDraft(e.target.value);setInvalid(false);}} onBlur={()=>commit(draft)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit(draft);}if(e.key==='Escape'){setDraft(value.toUpperCase());setInvalid(false);}}}/></div>{invalid&&<span id={`${id}-error`} className="ui-color-error">Enter a hex colour, such as #8054C7.</span>}</div>;
}

/** Temporary status feedback that never shifts page content. */
export function Toast({message,onDismiss,duration=6000}:{message:string;onDismiss:()=>void;duration?:number}) {
 const container=React.useContext(ToastContext),dismiss=React.useRef(onDismiss),[paused,setPaused]=React.useState(false);
 React.useEffect(()=>{dismiss.current=onDismiss;},[onDismiss]);
 React.useEffect(()=>{if(!message||paused)return;const timer=setTimeout(()=>dismiss.current(),duration);return()=>clearTimeout(timer);},[message,paused,duration]);
 if(!message||!container)return null;
 return createPortal(<div className="ui-toast" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setPaused(false);}}><p role="status">{message}</p><IconButton variant="ghost" label="Dismiss notification" onClick={onDismiss}><X size={16}/></IconButton></div>,container);
}

/** Independently collapsible settings section; children retain their state when folded. */
export function Disclosure({title,children,defaultOpen=true}:{title:string;children:React.ReactNode;defaultOpen?:boolean}){
 const [open,setOpen]=React.useState(defaultOpen);const id=React.useId();
 return <section className="ui-disclosure"><h3><Button variant="ghost" className="ui-disclosure-trigger" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>{title}<ChevronDown aria-hidden size={16} className={open?'is-open':undefined}/></Button></h3><div id={id} hidden={!open} className="ui-disclosure-body">{children}</div></section>;
}
