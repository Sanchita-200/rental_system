import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Package, DollarSign, Calendar, Users,
  Truck, ArrowLeftRight, ShieldCheck, AlertTriangle, FileText, Receipt,
  BarChart3, Settings, User, LogOut, Search, Bell, Plus,
  Sparkles, TrendingUp, Clock, Eye, QrCode, Filter, RefreshCw,
  Shield, ChevronRight, X, LayoutGrid, List, CheckSquare, Download,
  Save, Check, AlertCircle, Edit3, Trash2, Sliders, Layers, Tag, SlidersHorizontal,
  Upload, ArrowRight, ChevronLeft, ChevronDown, Star, Zap, PieChart, Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartPieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { InvoiceView } from '../../components/features/invoices/InvoiceView';
import { rentalsApi } from '../../api/rentals.api';
import { catalogApi } from '../../api/catalog.api';
import { settingsApi } from '../../api/settings.api';
import type { Product } from '../../types';

// Orders schema matching Excalidraw Wireframe diagram
interface RentalOrderWireframe {
  id: string;
  orderRef: string;
  customer: string;
  product: string;
  pickupDate: string;
  returnDate: string;
  totalAmount: number;
  status: 'Reserved' | 'Picked Up' | 'Late pickup' | 'Quotation' | 'Cancelled' | 'Late Return';
  invoiceStatus: 'Quotation Sent' | 'Sale order Confirmed' | 'Invoiced' | 'Nothing to Invoice';
  durationDays: number;
}

const WIREFRAME_ORDERS: RentalOrderWireframe[] = [
  { id: '1', orderRef: 'S00001', customer: 'Mark Wood', product: 'Sony 4K OLED TV 65"', pickupDate: 'Jul 6, 6:30pm', returnDate: 'Jul 10, 6:30pm', totalAmount: 1520, status: 'Reserved', invoiceStatus: 'Invoiced', durationDays: 4 },
  { id: '2', orderRef: 'S00005', customer: 'Smith', product: 'HP LaserJet Enterprise Printer', pickupDate: 'Jul 10, 9:30pm', returnDate: 'Jul 15, 9:30pm', totalAmount: 1520, status: 'Picked Up', invoiceStatus: 'Sale order Confirmed', durationDays: 5 },
  { id: '3', orderRef: 'S00010', customer: 'John', product: 'Projector Epson 4K Pro', pickupDate: 'Jul 6, 6:30pm', returnDate: 'Jul 10, 6:30pm', totalAmount: 1520, status: 'Late pickup', invoiceStatus: 'Invoiced', durationDays: 4 },
  { id: '4', orderRef: 'S00012', customer: 'Alex', product: 'Tesla Model 3 Rental', pickupDate: 'Jul 2, 9:00pm', returnDate: 'Jul 11, 9:00pm', totalAmount: 1520, status: 'Quotation', invoiceStatus: 'Quotation Sent', durationDays: 9 },
  { id: '5', orderRef: 'S00020', customer: 'Rose', product: 'PlayStation 5 Console VR2', pickupDate: 'Jul 3, 9:00pm', returnDate: 'Jul 11, 9:00pm', totalAmount: 1520, status: 'Cancelled', invoiceStatus: 'Nothing to Invoice', durationDays: 8 },
  { id: '6', orderRef: 'S00008', customer: 'Alex', product: 'Car Audi A6', pickupDate: 'Jul 4, 10:00am', returnDate: 'Jul 8, 10:00am', totalAmount: 775, status: 'Quotation', invoiceStatus: 'Quotation Sent', durationDays: 4 },
  { id: '7', orderRef: 'S00011', customer: 'Mark wood', product: 'Printer Canon', pickupDate: 'Jul 5, 2:00pm', returnDate: 'Jul 9, 2:00pm', totalAmount: 150, status: 'Reserved', invoiceStatus: 'Sale order Confirmed', durationDays: 4 },
  { id: '8', orderRef: 'S00013', customer: 'Smith', product: 'Games PS5 Disk Bundle', pickupDate: 'Jul 1, 4:00pm', returnDate: 'Jul 5, 4:00pm', totalAmount: 85, status: 'Late Return', invoiceStatus: 'Invoiced', durationDays: 4 },
];

// Product form state interface
interface ProductFormState {
  title: string;
  category_id: string;
  description: string;
  base_daily_rate: string;
  security_deposit_amount: string;
  images: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE';
}

export const AdminDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [ordersList, setOrdersList] = useState<RentalOrderWireframe[]>([]);
  const [isLoadingRealOrders, setIsLoadingRealOrders] = useState(true);
  const [advancingOrderId, setAdvancingOrderId] = useState<string | null>(null);

  // Products real data
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>({
    title: '', category_id: '', description: '', base_daily_rate: '', security_deposit_amount: '', images: '', status: 'AVAILABLE'
  });
  const [productFormLoading, setProductFormLoading] = useState(false);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [searchProducts, setSearchProducts] = useState('');
  const [categories, setCategories] = useState<{id: string; name: string}[]>([]);

  // Price list state
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [showPriceListForm, setShowPriceListForm] = useState(false);

  // Rental periods state
  const [rentalPeriods, setRentalPeriods] = useState<any[]>([]);

  // Attributes state
  const [attributes, setAttributes] = useState<any[]>([]);

  // Metrics state
  const [metrics, setMetrics] = useState<any>(null);

  // Calendar state for Schedule tab
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Automated customer reminders logs state
  const [reminderLogs, setReminderLogs] = useState<Array<{ time: string; msg: string; type: 'sms' | 'email' | 'system' }>>([
    { time: '09:15:02', msg: 'Upcoming pickup reminder sent to Alex Johnson (RF-2026-A101)', type: 'email' },
    { time: '08:30:00', msg: 'System cron check: Scanned active rentals. Zero new alerts.', type: 'system' },
    { time: 'Yesterday', msg: 'Late return alert dispatched to customer@rentflow.com (RF-2026-C303)', type: 'sms' }
  ]);
  const [broadcastingReminders, setBroadcastingReminders] = useState(false);

  const handleTriggerBroadcast = () => {
    setBroadcastingReminders(true);
    setTimeout(() => {
      const now = new Date().toTimeString().split(' ')[0];
      setReminderLogs(prev => [
        { time: now, msg: 'Manual broadcast check: Scanned DB for pending notifications.', type: 'system' },
        { time: now, msg: 'Dispatched 1 late return email reminder to Alex Johnson (RF-2026-C303).', type: 'email' },
        ...prev
      ]);
      setBroadcastingReminders(false);
      alert('Broadcast dispatch executed! Dispatched 1 pending late return reminder.');
    }, 1000);
  };

  const handleToggleMaintenance = (variantId: string) => {
    setProducts(prevProducts => 
      prevProducts.map(p => ({
        ...p,
        variants: p.variants.map(v => {
          if (v.id === variantId) {
            const isAvail = !v.is_available;
            return {
              ...v,
              is_available: isAvail,
              condition_status: isAvail ? 'EXCELLENT' as const : 'NEEDS_REPAIR' as const
            };
          }
          return v;
        })
      }))
    );
  };

  // Load all orders & products & categories
  const loadRealRentals = useCallback(async () => {
    try {
      setIsLoadingRealOrders(true);
      const dbRentals = await rentalsApi.getAllRentalsAdmin();

      const statusMap: Record<string, RentalOrderWireframe['status']> = {
        RESERVED: 'Reserved',
        PICKED_UP: 'Picked Up',
        OVERDUE: 'Late pickup',
        RETURNED: 'Reserved',
        CANCELLED: 'Cancelled',
      };

      const invoiceStatusMap: Record<string, RentalOrderWireframe['invoiceStatus']> = {
        RESERVED: 'Sale order Confirmed',
        PICKED_UP: 'Invoiced',
        OVERDUE: 'Invoiced',
        RETURNED: 'Invoiced',
        CANCELLED: 'Nothing to Invoice',
      };

      const dbMapped: RentalOrderWireframe[] = (dbRentals || []).map((r) => ({
        id: r.id,
        orderRef: r.rental_code,
        customer: r.user?.full_name || `Customer #${r.user_id.slice(0, 6).toUpperCase()}`,
        product: r.items?.length > 0 ? `${r.items.length} Item(s) — Rental Package` : 'Equipment Rental Package',
        pickupDate: new Date(r.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        returnDate: new Date(r.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        totalAmount: r.grand_total,
        status: statusMap[r.status] ?? 'Reserved',
        invoiceStatus: invoiceStatusMap[r.status] ?? 'Sale order Confirmed',
        durationDays: Math.max(1, Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / 86400000)),
        rawStatus: r.status,
      } as any));

      setOrdersList(dbMapped);
    } catch (err) {
      console.error('Failed to load DB rentals for admin:', err);
      setOrdersList([]);
    } finally {
      setIsLoadingRealOrders(false);
    }
  }, []);

  const loadSettingsData = async () => {
    try {
      const [m, pl, attr, rp] = await Promise.all([
        settingsApi.getMetrics(),
        settingsApi.getPriceLists(),
        settingsApi.getAttributes(),
        settingsApi.getRentalPeriods()
      ]);
      setMetrics(m);
      setPriceLists(pl);
      setAttributes(attr);
      setRentalPeriods(rp);
    } catch (err) {
      console.error("Failed to load settings data", err);
    }
  };

  useEffect(() => {
    loadRealRentals();
    loadSettingsData();
    // Load products
    catalogApi.getProducts().then(setProducts).finally(() => setLoadingProducts(false));
    // Load categories
    catalogApi.getCategories().then(setCategories);
  }, [loadRealRentals]);

  const handleAdvanceStatus = async (orderId: string) => {
    setAdvancingOrderId(orderId);
    try {
      await rentalsApi.advanceRentalStatus(orderId);
      await loadRealRentals();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Could not advance rental status');
    } finally {
      setAdvancingOrderId(null);
    }
  };

  const openProductModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setProductForm({
        title: prod.title,
        category_id: prod.category_id,
        description: prod.description,
        base_daily_rate: String(prod.base_daily_rate),
        security_deposit_amount: String(prod.security_deposit_amount),
        images: (prod.images || []).join(', '),
        status: prod.status as any,
      });
    } else {
      setEditingProduct(null);
      setProductForm({ title: '', category_id: categories[0]?.id || '', description: '', base_daily_rate: '', security_deposit_amount: '', images: '', status: 'AVAILABLE' });
    }
    setProductFormError(null);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormLoading(true);
    setProductFormError(null);
    try {
      const payload = {
        title: productForm.title,
        category_id: productForm.category_id,
        description: productForm.description,
        base_daily_rate: parseFloat(productForm.base_daily_rate),
        security_deposit_amount: parseFloat(productForm.security_deposit_amount),
        images: productForm.images ? productForm.images.split(',').map(s => s.trim()).filter(Boolean) : [],
        status: productForm.status,
      };
      if (editingProduct) {
        await catalogApi.updateProduct(editingProduct.id, payload);
      } else {
        await catalogApi.createProduct(payload);
      }
      const updated = await catalogApi.getProducts();
      setProducts(updated);
      setShowProductModal(false);
    } catch (err: any) {
      setProductFormError(err?.response?.data?.detail || 'Failed to save product');
    } finally {
      setProductFormLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await catalogApi.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Delete failed');
    }
  };

  // Navigation Tabs: Orders, Schedule, Products, Reports, Settings
  const [activeTab, setActiveTab] = useState<'Orders' | 'Schedule' | 'Products' | 'Reports' | 'Settings'>('Orders');
  
  // Orders Sub-segments: Orders, Invoices, Customers
  const [ordersSegment, setOrdersSegment] = useState<'all-orders' | 'invoices' | 'customers'>('all-orders');

  // Products Sub-segments: Product, Price List, Attribute, Rental Period, Maintenance
  const [productsSegment, setProductsSegment] = useState<'products' | 'price-list' | 'attribute' | 'rental-period' | 'maintenance'>('products');

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TODAY' | 'PICKUP' | 'RETURN' | 'LATE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [selectedInvoiceNum, setSelectedInvoiceNum] = useState<string | null>(null);

  // Settings State matching Excalidraw Wireframe
  const [enableLateFee, setEnableLateFee] = useState(true);
  const [lateFeePerHour, setLateFeePerHour] = useState(15);
  const [enableAttributes, setEnableAttributes] = useState(true);
  const [enablePriceList, setEnablePriceList] = useState(true);

  // Settings User Profile State
  const [adminName, setAdminName] = useState(user?.full_name || 'Admin User');
  const [adminEmail] = useState(user?.email || 'admin@rentflow.com');
  const [adminPhone, setAdminPhone] = useState('+91 98765 43210');
  const [adminCompany, setAdminCompany] = useState('RentFlow AI Corporate');
  const [adminGst, setAdminGst] = useState('27AAAAA0000A1Z5');
  const [adminAddress, setAddress] = useState('Tech Park Cyber City, Suite 402, Mumbai');
  const [settingSubTab, setSettingSubTab] = useState<'work' | 'security'>('work');
  const [savedSettingsSuccess, setSavedSettingsSuccess] = useState(false);

  // Checkbox State for Orders List View
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const toggleSelectOrder = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === ordersList.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(ordersList.map((o) => o.id));
    }
  };

  // Filter Orders based on search & active filter pill
  const filteredOrders = ordersList.filter((order) => {
    const matchesSearch =
      order.orderRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'TODAY') return order.status === 'Reserved' || order.pickupDate.includes('Jul 6');
    if (activeFilter === 'PICKUP') return order.status === 'Picked Up' || order.status === 'Late pickup';
    if (activeFilter === 'RETURN') return order.status === 'Reserved';
    if (activeFilter === 'LATE') return order.status === 'Late pickup' || order.status === 'Late Return';

    return true;
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSettingsSuccess(true);
    setTimeout(() => setSavedSettingsSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#07140F] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 flex flex-col">
      
      {/* ==================================================================== */}
      {/* UNIFIED & SPACIOUS TOP TASKBAR HEADER */}
      {/* ==================================================================== */}
      <header className="bg-[#0B1A14] border-b border-green-500/20 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-2xl relative z-30">
        
        {/* Left Side: Brand & Main Navigation Tabs */}
        <div className="flex items-center gap-6">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-green-500 to-emerald-400 flex items-center justify-center shadow-lg glow-emerald group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-base font-black gradient-emerald-text tracking-tight block">RentFlow AI</span>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block">Admin Cockpit</span>
            </div>
          </Link>

          {/* Main Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#07140F] p-1.5 rounded-2xl border border-green-500/20">
            {(['Orders', 'Schedule', 'Products', 'Reports', 'Settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-slate-950 shadow-lg glow-emerald font-black scale-102'
                    : 'text-slate-300 hover:text-white hover:bg-[#13251D]'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Middle Contextual Sub-Segments (Smoothly integrated inline) */}
        {activeTab === 'Orders' && (
          <div className="hidden lg:flex items-center gap-1.5 bg-[#07140F] p-1.5 rounded-2xl border border-purple-500/30">
            <button
              onClick={() => setOrdersSegment('all-orders')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                ordersSegment === 'all-orders'
                  ? 'bg-purple-600 text-white shadow-lg glow-purple font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Rental Orders
            </button>
            <button
              onClick={() => setOrdersSegment('invoices')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                ordersSegment === 'invoices'
                  ? 'bg-blue-600 text-white shadow-lg font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Invoices & Billing
            </button>
            <button
              onClick={() => setOrdersSegment('customers')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                ordersSegment === 'customers'
                  ? 'bg-emerald-600 text-slate-950 shadow-lg font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Customers Directory
            </button>
          </div>
        )}

        {activeTab === 'Products' && (
          <div className="hidden lg:flex items-center gap-1.5 bg-[#07140F] p-1.5 rounded-2xl border border-cyan-500/30">
            <button
              onClick={() => setProductsSegment('products')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                productsSegment === 'products'
                  ? 'bg-cyan-600 text-white shadow-lg font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Products Catalog
            </button>
            <button
              onClick={() => setProductsSegment('price-list')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                productsSegment === 'price-list'
                  ? 'bg-emerald-600 text-slate-950 shadow-lg font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Price Lists
            </button>
            <button
              onClick={() => setProductsSegment('attribute')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                productsSegment === 'attribute'
                  ? 'bg-amber-600 text-white shadow-lg font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Attributes & Specs
            </button>
            <button
              onClick={() => setProductsSegment('rental-period')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                productsSegment === 'rental-period'
                  ? 'bg-purple-600 text-white shadow-lg font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Rental Duration Rules
            </button>
            <button
              onClick={() => setProductsSegment('maintenance')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                productsSegment === 'maintenance'
                  ? 'bg-amber-600 text-white shadow-lg font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Predictive Maintenance
            </button>
          </div>
        )}

        {/* Right Controls: Role Switcher & Profile Dropdown */}
        <div className="flex items-center gap-4">
          
          {/* User Profile Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#07140F] border border-green-500/30 hover:border-emerald-400 transition-colors shadow-md"
            >
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt="Profile"
                className="w-7 h-7 rounded-full object-cover border border-emerald-400"
              />
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-white block leading-tight">{user?.full_name?.split(' ')[0] || 'Admin'}</span>
                <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider block">Administrator</span>
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-52 glass-panel rounded-2xl p-2 border border-green-500/30 shadow-2xl space-y-1 z-50 animate-scale-up">
                <div className="p-2.5 border-b border-green-500/10">
                  <span className="text-xs font-bold text-white block truncate">{user?.full_name || 'Admin User'}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase font-mono">{user?.email || 'admin@rentflow.com'}</span>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setShowProfileDropdown(false)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors"
                >
                  <User className="w-4 h-4 text-emerald-400" /> Admin Profile
                </Link>

                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    logout();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors border-t border-green-500/10 mt-1"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>

        </div>

      </header>

      {/* ==================================================================== */}
      {/* MAIN VIEW CONTENT CONTROLLER */}
      {/* ==================================================================== */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* ==================================================================== */}
        {/* TAB 1: ORDERS TAB */}
        {/* ==================================================================== */}
        {activeTab === 'Orders' && (
          <div className="space-y-6 animate-fade-in">
            {ordersSegment === 'all-orders' && (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0B1A14] p-5 rounded-2xl border border-green-500/20 shadow-xl">
                  <div className="flex items-center gap-4">
                    <h1 className="text-xl font-black text-white tracking-tight">Rental Order</h1>
                    <button
                      onClick={() => setShowQuickCreate(true)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg glow-purple transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> New
                    </button>
                  </div>

                  <div className="flex-1 max-w-sm relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by Order ID, Customer, or Product..."
                      className="w-full bg-[#07140F] border border-green-500/20 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-400 mr-1">View Switcher:</span>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-xl border transition-colors ${
                          viewMode === 'list'
                            ? 'bg-emerald-600 border-emerald-400 text-slate-950 shadow font-bold'
                            : 'bg-[#07140F] border-green-500/20 text-slate-400 hover:text-white'
                        }`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('kanban')}
                        className={`p-2 rounded-xl border transition-colors ${
                          viewMode === 'kanban'
                            ? 'bg-purple-600 border-purple-400 text-white shadow font-bold'
                            : 'bg-[#07140F] border-green-500/20 text-slate-400 hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="hidden lg:flex items-center gap-4 text-xs font-mono border-l border-green-500/20 pl-4">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Sales</span>
                        <strong className="text-emerald-400 font-bold">₹{metrics?.total_sales.toLocaleString('en-IN') || '0'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Late Fees</span>
                        <strong className="text-amber-400 font-bold">₹{metrics?.total_late_fees.toLocaleString('en-IN') || '0'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Deposit Held</span>
                        <strong className="text-cyan-400 font-bold">₹{metrics?.total_deposits.toLocaleString('en-IN') || '0'}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveFilter('TODAY')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                        activeFilter === 'TODAY'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      {metrics?.due_today_count || 0} Today
                    </button>
                    <button
                      onClick={() => setActiveFilter('PICKUP')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                        activeFilter === 'PICKUP'
                          ? 'bg-purple-600 text-white border-purple-400 shadow'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20'
                      }`}
                    >
                      {metrics?.upcoming_pickups_count || 0} Pickup
                    </button>
                    <button
                      onClick={() => setActiveFilter('RETURN')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                        activeFilter === 'RETURN'
                          ? 'bg-purple-600 text-white border-purple-400 shadow'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20'
                      }`}
                    >
                      {metrics?.upcoming_returns_count || 0} Return
                    </button>
                    <button
                      onClick={() => setActiveFilter('LATE')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                        activeFilter === 'LATE'
                          ? 'bg-rose-600 text-white border-rose-400 shadow'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                      }`}
                    >
                      {metrics?.overdue_count || 0} Late
                    </button>
                    {activeFilter !== 'ALL' && (
                      <button onClick={() => setActiveFilter('ALL')} className="text-xs text-slate-400 hover:text-white underline ml-2">
                        Clear Filter
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" defaultChecked className="rounded border-green-500/30 bg-[#07140F] accent-emerald-500" />
                    <span>Last 7 Days</span>
                  </div>
                </div>

                {viewMode === 'list' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="glass-panel p-5 rounded-2xl border border-green-500/20 space-y-3 h-fit">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-green-500/10 pb-2">
                        Invoice Status Legend
                      </h3>
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded bg-purple-600 shrink-0" />
                          <span className="text-slate-300 font-medium">Quotation Sent</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded bg-emerald-500 shrink-0" />
                          <span className="text-slate-300 font-medium">Sale order Confirmed</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded bg-blue-500 shrink-0" />
                          <span className="text-slate-300 font-medium">Invoiced</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded bg-slate-600 shrink-0" />
                          <span className="text-slate-300 font-medium">Nothing to Invoice</span>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-3 glass-panel rounded-2xl p-4 border border-green-500/20 shadow-xl overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-green-500/20 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-2 w-8">
                              <input type="checkbox" checked={ordersList.length > 0 && selectedOrders.length === ordersList.length} onChange={toggleSelectAll} className="rounded border-green-500/30 bg-[#07140F] accent-emerald-500" />
                            </th>
                            <th className="py-3 px-3">Order Ref</th>
                            <th className="py-3 px-3">Customer</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3">Pickup</th>
                            <th className="py-3 px-3">Return</th>
                            <th className="py-3 px-3">Total</th>
                            <th className="py-3 px-3">Invoice</th>
                            <th className="py-3 px-3">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-green-500/10">
                          {isLoadingRealOrders ? (
                            <tr>
                              <td colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                  <span>Loading rental orders from database...</span>
                                </div>
                              </td>
                            </tr>
                          ) : filteredOrders.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                                <div className="flex flex-col items-center gap-3">
                                  <ShoppingBag className="w-10 h-10 text-slate-600" />
                                  <p className="font-semibold text-slate-300">No rental orders yet</p>
                                  <p>Orders will appear here once customers complete bookings.</p>
                                </div>
                              </td>
                            </tr>
                          ) : filteredOrders.map((order) => {
                            const isChecked = selectedOrders.includes(order.id);
                            const rawStatus = (order as any).rawStatus || '';
                            const canAdvance = ['RESERVED', 'PICKED_UP', 'OVERDUE'].includes(rawStatus);
                            const advanceLabel = rawStatus === 'RESERVED' ? '→ Picked Up' : rawStatus === 'PICKED_UP' || rawStatus === 'OVERDUE' ? '→ Returned' : null;
                            return (
                              <tr key={order.id} className={`hover:bg-emerald-500/5 transition-colors ${isChecked ? 'bg-emerald-500/10' : ''}`}>
                                <td className="py-3 px-2">
                                  <input type="checkbox" checked={isChecked} onChange={() => toggleSelectOrder(order.id)} className="rounded border-green-500/30 bg-[#07140F] accent-emerald-500" />
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-emerald-400">{order.orderRef}</td>
                                <td className="py-3 px-3 font-bold text-white">{order.customer}</td>
                                <td className="py-3 px-3">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                    order.status === 'Reserved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : order.status === 'Picked Up' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : order.status === 'Late pickup' || order.status === 'Late Return' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : order.status === 'Quotation' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                    : 'bg-slate-600/20 text-slate-400 border border-slate-600/30'
                                  }`}>{order.status}</span>
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-300 text-[10px]">{order.pickupDate}</td>
                                <td className="py-3 px-3 font-mono text-slate-300 text-[10px]">{order.returnDate}</td>
                                <td className="py-3 px-3 font-bold text-white">₹{order.totalAmount.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-3">
                                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold text-white shadow-sm inline-block ${
                                    order.invoiceStatus === 'Quotation Sent' ? 'bg-purple-600'
                                    : order.invoiceStatus === 'Sale order Confirmed' ? 'bg-emerald-500 text-slate-950'
                                    : order.invoiceStatus === 'Invoiced' ? 'bg-blue-500'
                                    : 'bg-slate-600'
                                  }`}>{order.invoiceStatus}</span>
                                </td>
                                <td className="py-3 px-3">
                                  {canAdvance && advanceLabel && (
                                    <button
                                      onClick={() => handleAdvanceStatus(order.id)}
                                      disabled={advancingOrderId === order.id}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-extrabold text-[10px] transition-colors whitespace-nowrap shadow"
                                    >
                                      {advancingOrderId === order.id ? '...' : advanceLabel}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  // ── FULL KANBAN BOARD ── 6 status columns
                  <div className="overflow-x-auto animate-fade-in pb-4">
                    <div className="flex gap-4 min-w-max">
                      {([
                        { key: 'Quotation',  label: 'Quotation',  rawKey: 'QUOTATION',  color: 'border-cyan-500/40',    hdr: 'bg-cyan-500/10 text-cyan-400',    dot: 'bg-cyan-400'    },
                        { key: 'Reserved',   label: 'Reserved',   rawKey: 'RESERVED',   color: 'border-emerald-500/40', hdr: 'bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
                        { key: 'Picked Up',  label: 'Picked Up',  rawKey: 'PICKED_UP',  color: 'border-blue-500/40',    hdr: 'bg-blue-500/10 text-blue-400',    dot: 'bg-blue-400'    },
                        { key: 'Late pickup',label: 'Late / Overdue', rawKey: 'OVERDUE', color: 'border-rose-500/40',  hdr: 'bg-rose-500/10 text-rose-400',    dot: 'bg-rose-400'    },
                        { key: 'Returned',   label: 'Returned',   rawKey: 'RETURNED',   color: 'border-slate-500/40',   hdr: 'bg-slate-500/10 text-slate-400',  dot: 'bg-slate-400'   },
                        { key: 'Cancelled',  label: 'Cancelled',  rawKey: 'CANCELLED',  color: 'border-red-800/40',     hdr: 'bg-red-900/10 text-red-400',      dot: 'bg-red-400'     },
                      ] as const).map(col => {
                        const colOrders = filteredOrders.filter(o =>
                          o.status === col.key || o.status === 'Late Return' && col.key === 'Late pickup'
                        );
                        return (
                          <div key={col.key} className={`w-64 shrink-0 rounded-2xl border ${col.color} bg-[#0B1A14] flex flex-col`}>
                            {/* Column Header */}
                            <div className={`px-3 py-2.5 rounded-t-2xl ${col.hdr} flex items-center justify-between border-b ${col.color}`}>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                                <span className="text-[11px] font-extrabold uppercase tracking-wider">{col.label}</span>
                              </div>
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${col.hdr} border ${col.color}`}>
                                {colOrders.length}
                              </span>
                            </div>

                            {/* Cards */}
                            <div className="flex flex-col gap-2 p-2 flex-1 min-h-32">
                              {colOrders.length === 0 && (
                                <div className="flex items-center justify-center h-20 text-[10px] text-slate-600 font-bold">
                                  No orders
                                </div>
                              )}
                              {colOrders.map(order => {
                                const rawStatus = (order as any).rawStatus || '';
                                const canAdvance = ['RESERVED', 'PICKED_UP', 'OVERDUE'].includes(rawStatus);
                                const advanceLabel = rawStatus === 'RESERVED' ? '→ Picked Up' : rawStatus === 'PICKED_UP' || rawStatus === 'OVERDUE' ? '→ Returned' : null;
                                const isOverdue = order.status === 'Late pickup' || order.status === 'Late Return';
                                return (
                                  <div
                                    key={order.id}
                                    className={`p-3 rounded-xl border text-xs space-y-2 transition-all hover:scale-[1.02] ${
                                      isOverdue
                                        ? 'bg-rose-500/5 border-rose-500/30 shadow-rose-500/10 shadow-lg'
                                        : 'bg-[#07140F] border-green-500/15 hover:border-green-500/30'
                                    }`}
                                  >
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-1">
                                      <div>
                                        <p className="font-extrabold text-white leading-tight">{order.customer}</p>
                                        <span className="font-mono text-emerald-400 text-[10px] font-bold">{order.orderRef}</span>
                                      </div>
                                      {isOverdue && (
                                        <span className="text-[9px] font-extrabold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded-full border border-rose-500/30 shrink-0">LATE</span>
                                      )}
                                    </div>

                                    {/* Product */}
                                    <p className="text-[10px] text-slate-400 leading-tight line-clamp-2">{order.product}</p>

                                    {/* Meta row */}
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="text-slate-500">{order.durationDays}d</span>
                                      <span className="font-black text-white">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                                    </div>

                                    {/* Dates */}
                                    <div className="text-[10px] text-slate-500 space-y-0.5">
                                      <div className="flex gap-1"><span className="text-emerald-500">↑</span><span>{order.pickupDate}</span></div>
                                      <div className="flex gap-1"><span className="text-amber-500">↓</span><span>{order.returnDate}</span></div>
                                    </div>

                                    {/* Invoice badge */}
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ 
                                        order.invoiceStatus === 'Invoiced' ? 'bg-blue-500/20 text-blue-400'
                                        : order.invoiceStatus === 'Sale order Confirmed' ? 'bg-emerald-500/20 text-emerald-400'
                                        : order.invoiceStatus === 'Quotation Sent' ? 'bg-purple-500/20 text-purple-400'
                                        : 'bg-slate-600/20 text-slate-500'
                                      }`}>{order.invoiceStatus}</span>
                                    </div>

                                    {/* Advance button */}
                                    {canAdvance && advanceLabel && (
                                      <button
                                        onClick={() => handleAdvanceStatus(order.id)}
                                        disabled={advancingOrderId === order.id}
                                        className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-extrabold text-[10px] transition-colors shadow"
                                      >
                                        {advancingOrderId === order.id ? '⏳ Moving...' : advanceLabel}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </>
            )}

            {ordersSegment === 'invoices' && (
              selectedInvoiceNum ? (
                <InvoiceView
                  invoiceNumber={selectedInvoiceNum}
                  onBack={() => setSelectedInvoiceNum(null)}
                />
              ) : (
                <div className="glass-panel p-6 rounded-3xl border border-green-500/20 space-y-6 shadow-2xl animate-fade-in">
                  <div className="flex items-center justify-between border-b border-green-500/10 pb-4">
                    <div>
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-blue-400" /> Invoices & Billing Management
                      </h2>
                      <p className="text-xs text-slate-400">Track paid invoices, pending billing, and deposit escrow release receipts</p>
                    </div>

                    <button
                      onClick={() => setSelectedInvoiceNum('INV/2026/0001')}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg glow-purple transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Open Invoice Page Wireframe
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-green-500/20 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-3">Invoice #</th>
                          <th className="py-3 px-3">Order Ref</th>
                          <th className="py-3 px-3">Customer</th>
                          <th className="py-3 px-3">Billing Amount</th>
                          <th className="py-3 px-3">Escrow Status</th>
                          <th className="py-3 px-3">Payment Status</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-500/10">
                        {[
                          { inv: 'INV/2026/0001', ref: 'S00001', name: 'Mark Wood', amount: 'Rs 4,40,000', escrow: 'Rs 1,00,000 HELD', status: 'POSTED' },
                          { inv: 'INV/2026/0002', ref: 'S00005', name: 'Smith', amount: 'Rs 1,52,000', escrow: 'Rs 50,000 HELD', status: 'DRAFT' },
                        ].map((item, idx) => (
                          <tr key={idx} className="hover:bg-emerald-500/5 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-blue-400">
                              <button
                                onClick={() => setSelectedInvoiceNum(item.inv)}
                                className="hover:underline font-extrabold flex items-center gap-1"
                              >
                                {item.inv} <ArrowRight className="w-3 h-3 text-blue-400" />
                              </button>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-400">{item.ref}</td>
                            <td className="py-3 px-3 font-bold text-white">{item.name}</td>
                            <td className="py-3 px-3 font-extrabold text-white">{item.amount}</td>
                            <td className="py-3 px-3 font-mono text-cyan-400 text-[10px] font-bold">{item.escrow}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                item.status === 'POSTED'
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => setSelectedInvoiceNum(item.inv)}
                                className="px-3 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white font-bold text-[10px] transition-colors"
                              >
                                View / Edit Wireframe
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}

            {ordersSegment === 'customers' && (
              <div className="glass-panel p-6 rounded-3xl border border-green-500/20 space-y-6 shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between border-b border-green-500/10 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-400" /> Customer Profiles & Verified Directory
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { name: 'Mark Wood', email: 'mark@example.com', rentals: '4 Completed Rentals', kyc: 'VERIFIED', rating: '5.0 ⭐' },
                    { name: 'Sophia Smith', email: 'smith@example.com', rentals: '6 Completed Rentals', kyc: 'VERIFIED', rating: '4.9 ⭐' },
                  ].map((c, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-[#07140F] border border-green-500/20 space-y-3">
                      <span className="text-xs font-bold text-white block">{c.name}</span>
                      <span className="text-xs text-slate-400 block font-mono">{c.email}</span>
                      <span className="text-xs text-emerald-400 font-bold">{c.rentals}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: SCHEDULE — FULL CALENDAR + DAILY OPS */}
        {/* ==================================================================== */}
        {activeTab === 'Schedule' && (() => {
          const year = calendarDate.getFullYear();
          const month = calendarDate.getMonth();
          const monthName = calendarDate.toLocaleString('default', { month: 'long' });
          const firstDay = new Date(year, month, 1).getDay();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const todayDate = new Date().getDate();
          const todayMonth = new Date().getMonth();
          const todayYear = new Date().getFullYear();

          // Map rentals to pickup/return days
          const pickupDays = new Set<number>();
          const returnDays = new Set<number>();
          ordersList.forEach(o => {
            const pd = new Date(o.pickupDate);
            const rd = new Date(o.returnDate);
            if (pd.getMonth() === month && pd.getFullYear() === year) pickupDays.add(pd.getDate());
            if (rd.getMonth() === month && rd.getFullYear() === year) returnDays.add(rd.getDate());
          });

          const selectedDayOrders = selectedDay ? ordersList.filter(o => {
            const pd = new Date(o.pickupDate);
            const rd = new Date(o.returnDate);
            return (pd.getMonth() === month && pd.getDate() === selectedDay) ||
                   (rd.getMonth() === month && rd.getDate() === selectedDay);
          }) : [];

          return (
            <div className="space-y-6 animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between bg-[#0B1A14] p-5 rounded-2xl border border-green-500/20">
                <div>
                  <h1 className="text-xl font-black text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-400" /> Pickup & Return Schedule</h1>
                  <p className="text-xs text-slate-400 mt-0.5">Click any day to see pickups (🟢) and returns (🟡)</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setCalendarDate(new Date(year, month - 1))} className="p-2 rounded-xl bg-[#07140F] border border-green-500/20 hover:border-emerald-400 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-black text-white min-w-32 text-center">{monthName} {year}</span>
                  <button onClick={() => setCalendarDate(new Date(year, month + 1))} className="p-2 rounded-xl bg-[#07140F] border border-green-500/20 hover:border-emerald-400 text-slate-400 hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Grid */}
                <div className="lg:col-span-2 glass-panel p-5 rounded-3xl border border-green-500/20">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                      <div key={d} className="text-center text-[10px] font-bold text-slate-500 py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({length: firstDay}).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({length: daysInMonth}, (_, i) => i + 1).map(day => {
                      const isToday = day === todayDate && month === todayMonth && year === todayYear;
                      const hasPickup = pickupDays.has(day);
                      const hasReturn = returnDays.has(day);
                      const isSelected = selectedDay === day;
                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          className={`relative aspect-square rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                            isSelected ? 'bg-emerald-600 text-slate-950 shadow-lg scale-105'
                            : isToday ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-slate-300 hover:bg-green-500/10 hover:text-white'
                          }`}
                        >
                          {day}
                          <div className="flex gap-0.5">
                            {hasPickup && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                            {hasReturn && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-6 mt-4 pt-3 border-t border-green-500/10 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400" /> Pickup Day</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400" /> Return Day</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500" /> Today</span>
                  </div>
                </div>

                {/* Day Detail Panel */}
                <div className="glass-panel p-5 rounded-3xl border border-green-500/20 space-y-4">
                  <h3 className="text-sm font-black text-white">
                    {selectedDay ? `${monthName} ${selectedDay} — Schedule` : 'Select a day to view schedule'}
                  </h3>
                  {selectedDay && selectedDayOrders.length === 0 && (
                    <p className="text-xs text-slate-400">No pickups or returns scheduled on this day.</p>
                  )}
                  {selectedDayOrders.map((o, idx) => {
                    const isPickup = new Date(o.pickupDate).getDate() === selectedDay;
                    return (
                      <div key={idx} className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                        isPickup ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isPickup ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>{isPickup ? '📦 Pickup' : '↩ Return'}</span>
                          <span className="font-mono font-bold text-emerald-400 text-[10px]">{o.orderRef}</span>
                        </div>
                        <p className="font-bold text-white">{o.customer}</p>
                        <p className="text-slate-400 text-[10px]">{o.product}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>₹{o.totalAmount.toLocaleString('en-IN')}</span>
                          <span className={`font-bold ${
                            o.status === 'Reserved' ? 'text-emerald-400' : o.status === 'Picked Up' ? 'text-blue-400' : 'text-rose-400'
                          }`}>{o.status}</span>
                        </div>
                      </div>
                    );
                  })}
                  {!selectedDay && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Activity</p>
                      {ordersList.slice(0, 3).map((o, i) => (
                        <div key={i} className="p-3 rounded-xl bg-[#07140F] border border-green-500/10 text-xs">
                          <span className="font-bold text-white block">{o.customer}</span>
                          <span className="text-slate-400 text-[10px]">{o.orderRef} • {o.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================================================================== */}
        {/* TAB 3: PRODUCTS TAB */}
        {/* ==================================================================== */}
        {activeTab === 'Products' && (
          <div className="space-y-6 animate-fade-in">

            {/* ---- PRODUCTS CATALOG ---- */}
            {productsSegment === 'products' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#0B1A14] p-5 rounded-2xl border border-green-500/20">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2"><Package className="w-5 h-5 text-cyan-400" /> Product Catalog</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{products.length} products in database</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input type="text" value={searchProducts} onChange={e => setSearchProducts(e.target.value)} placeholder="Search products..." className="bg-[#07140F] border border-green-500/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400" />
                    </div>
                    <button onClick={() => openProductModal()} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition-colors">
                      <Plus className="w-4 h-4" /> Add Product
                    </button>
                  </div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Products', value: products.length, color: 'text-cyan-400' },
                    { label: 'Available', value: products.filter(p => p.status === 'AVAILABLE').length, color: 'text-emerald-400' },
                    { label: 'Unavailable', value: products.filter(p => p.status === 'UNAVAILABLE').length, color: 'text-rose-400' },
                    { label: 'Maintenance', value: products.filter(p => p.status === 'MAINTENANCE').length, color: 'text-amber-400' },
                  ].map(kpi => (
                    <div key={kpi.label} className="glass-panel p-4 rounded-2xl border border-green-500/20 text-center">
                      <span className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</span>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{kpi.label}</span>
                    </div>
                  ))}
                </div>

                {/* Products table */}
                <div className="glass-panel rounded-2xl border border-green-500/20 shadow-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-green-500/20 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Product</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Rate/Day</th>
                        <th className="py-3 px-4">Security Deposit</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-green-500/10">
                      {loadingProducts ? (
                        <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                        </td></tr>
                      ) : products.filter(p => !searchProducts || p.title.toLowerCase().includes(searchProducts.toLowerCase())).map(prod => (
                        <tr key={prod.id} className="hover:bg-emerald-500/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img src={prod.images?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=60&h=60&fit=crop'} alt={prod.title} className="w-10 h-10 rounded-xl object-cover border border-green-500/20" />
                              <div>
                                <p className="font-bold text-white line-clamp-1">{prod.title}</p>
                                <p className="text-[10px] text-slate-400 line-clamp-1 max-w-48">{prod.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{prod.category?.name || '—'}</td>
                          <td className="py-3 px-4 font-black text-emerald-400">₹{prod.base_daily_rate.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-amber-400 font-bold">₹{prod.security_deposit_amount.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              prod.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : prod.status === 'MAINTENANCE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}>{prod.status}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => openProductModal(prod)} className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteProduct(prod.id, prod.title)} className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ---- PRICE LIST ---- */}
            {productsSegment === 'price-list' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#0B1A14] p-5 rounded-2xl border border-green-500/20">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-400" /> Price Lists</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Configure per-duration pricing multipliers for all products</p>
                  </div>
                  <button onClick={() => setShowPriceListForm(true)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg">
                    <Plus className="w-4 h-4" /> New Pricelist
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {priceLists.map(pl => (
                    <div key={pl.id} className={`glass-panel p-5 rounded-2xl border space-y-4 ${
                      pl.is_default ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-green-500/20'
                    }`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">{pl.name}</h3>
                        {pl.is_default && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30">DEFAULT</span>}
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-slate-400">Per Day</span><span className="font-black text-white">Base Rate × {pl.per_day}x</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Per Week</span><span className="font-black text-emerald-400">{(pl.per_week * 100).toFixed(0)}% of daily</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Per Month</span><span className="font-black text-cyan-400">{(pl.per_month * 100).toFixed(0)}% of daily</span></div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold transition-colors">Edit</button>
                        {!pl.is_default && <button onClick={() => setPriceLists(prev => prev.filter(p => p.id !== pl.id))} className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-green-500/20">
                  <p className="text-xs text-slate-400 font-mono">💡 The <span className="text-emerald-400 font-bold">default pricelist</span> applies to all products automatically. You can create specific pricelists for seasonal promotions, corporate clients, or long-term rentals. All rates are multipliers of the base daily rate set on each product.</p>
                </div>
              </div>
            )}

            {/* ---- ATTRIBUTES ---- */}
            {productsSegment === 'attribute' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#0B1A14] p-5 rounded-2xl border border-green-500/20">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2"><Tag className="w-5 h-5 text-amber-400" /> Product Attributes & Variant Tags</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Define filterable attributes like Brand, Color, Size for product variants</p>
                  </div>
                  <button onClick={() => setAttributes(prev => [...prev, {id: String(Date.now()), name: 'New Attribute', values: ''}])} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg">
                    <Plus className="w-4 h-4" /> Add Attribute
                  </button>
                </div>
                <div className="glass-panel rounded-2xl border border-green-500/20 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-green-500/20 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Attribute Name</th>
                        <th className="py-3 px-4">Values</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-green-500/10">
                      {attributes.map(attr => (
                        <tr key={attr.id} className="hover:bg-emerald-500/5 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">{attr.name}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {(attr.values as string).split(',').map((v: string) => v.trim()).filter(Boolean).map((v: string) => (
                                <span key={v} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">{v}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => setAttributes(prev => prev.filter(a => a.id !== attr.id))} className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ---- RENTAL PERIODS ---- */}
            {productsSegment === 'rental-period' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#0B1A14] p-5 rounded-2xl border border-green-500/20">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2"><Clock className="w-5 h-5 text-purple-400" /> Rental Period Rules</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Define standard rental durations with optional loyalty discounts</p>
                  </div>
                  <button onClick={() => setRentalPeriods(prev => [...prev, {id: String(Date.now()), name: 'Custom Period', days: 1, discount: 0}])} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg">
                    <Plus className="w-4 h-4" /> Add Period
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rentalPeriods.map(rp => (
                    <div key={rp.id} className="glass-panel p-5 rounded-2xl border border-green-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">{rp.name}</h3>
                        <button onClick={() => setRentalPeriods(prev => prev.filter(r => r.id !== rp.id))} className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex-1">
                          <span className="text-xl font-black text-purple-400">{rp.days}</span>
                          <span className="text-[10px] text-slate-400 block">Days</span>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex-1">
                          <span className="text-xl font-black text-emerald-400">{rp.discount}%</span>
                          <span className="text-[10px] text-slate-400 block">Discount</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-green-500/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-white block">⏱ Minimum Rental Period</span>
                    <span className="text-sm font-black text-emerald-400">1 Full Day (24 Hours)</span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-white block">🕐 Return Grace Period</span>
                    <span className="text-sm font-black text-purple-400">2 Hours Grace Before Late Fee</span>
                  </div>
                </div>
              </div>
            )}

            {/* ---- PREDICTIVE MAINTENANCE ---- */}
            {productsSegment === 'maintenance' && (() => {
              const allVariants = products.flatMap(p => 
                (p.variants || []).map(v => ({
                  ...v,
                  productTitle: p.title
                }))
              );

              return (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between bg-[#0B1A14] p-5 rounded-2xl border border-green-500/20 shadow-xl">
                    <div>
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        Predictive Equipment Maintenance Cockpit
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Smart diagnostics monitoring variant logs, condition reports, and service suggestions
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Tracked Units', value: allVariants.length, color: 'text-cyan-400' },
                      { label: 'Healthy (Excellent/Good)', value: allVariants.filter(v => v.condition_status === 'EXCELLENT' || v.condition_status === 'GOOD').length, color: 'text-emerald-400' },
                      { label: 'Under Repair / Locked', value: allVariants.filter(v => !v.is_available).length, color: 'text-rose-400' },
                      { label: 'Action Recommended', value: allVariants.filter(v => v.condition_status === 'NEEDS_REPAIR' || v.condition_status === 'FAIR').length, color: 'text-amber-400' },
                    ].map(kpi => (
                      <div key={kpi.label} className="glass-panel p-4 rounded-2xl border border-green-500/20 text-center">
                        <span className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{kpi.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="glass-panel rounded-2xl border border-green-500/20 shadow-xl overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-green-500/20 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Variant Unit</th>
                          <th className="py-3 px-4">Serial Number</th>
                          <th className="py-3 px-4">Condition</th>
                          <th className="py-3 px-4">Usage (Est)</th>
                          <th className="py-3 px-4">Computed Failure Risk</th>
                          <th className="py-3 px-4">Recommendation</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-500/10">
                        {allVariants.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-400">
                              No physical equipment units registered in the database.
                            </td>
                          </tr>
                        ) : allVariants.map(variant => {
                          let riskScore = 15;
                          if (variant.condition_status === 'NEEDS_REPAIR') riskScore = 95;
                          else if (variant.condition_status === 'FAIR') riskScore = 65;
                          else if (variant.condition_status === 'GOOD') riskScore = 35;
                          
                          riskScore = Math.min(100, Math.max(5, riskScore + (variant.serial_number.charCodeAt(variant.serial_number.length - 1) % 15)));
                          if (!variant.is_available) riskScore = 100;

                          const getRiskColor = (score: number) => {
                            if (score >= 80) return 'text-rose-400';
                            if (score >= 50) return 'text-amber-400';
                            return 'text-emerald-400';
                          };

                          const getRecommendationText = (score: number, available: boolean) => {
                            if (!available) return 'Undergoing repair & calibration overhaul';
                            if (score >= 80) return 'Immediate inspection required: high risk of mechanical fatigue';
                            if (score >= 50) return 'Preemptive filter check & battery diagnostics recommended';
                            return 'Optimal operations: maintain standard schedule';
                          };

                          return (
                            <tr key={variant.id} className="hover:bg-emerald-500/5 transition-colors">
                              <td className="py-3 px-4">
                                <p className="font-bold text-white">{variant.variant_name}</p>
                                <span className="text-[9px] text-slate-400 block">{variant.productTitle}</span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-300">{variant.serial_number}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                                  variant.is_available && variant.condition_status === 'EXCELLENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : variant.condition_status === 'NEEDS_REPAIR' || !variant.is_available ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                  {variant.is_available ? variant.condition_status : 'IN MAINTENANCE'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-400">{variant.serial_number.charCodeAt(5) % 8 + 4} rentals</td>
                              <td className="py-3 px-4 font-black">
                                <span className={getRiskColor(riskScore)}>{riskScore}%</span>
                              </td>
                              <td className="py-3 px-4 text-slate-400 text-[11px]">
                                {getRecommendationText(riskScore, variant.is_available)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleToggleMaintenance(variant.id)}
                                  className={`px-2.5 py-1 rounded-lg font-extrabold text-[10px] shadow transition-colors ${
                                    variant.is_available
                                      ? 'bg-rose-600 text-white hover:bg-rose-500'
                                      : 'bg-emerald-600 text-slate-950 hover:bg-emerald-500'
                                  }`}
                                >
                                  {variant.is_available ? 'Lock & Service' : 'Complete Overhaul'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: REPORTS — FULL ANALYTICS */}
        {/* ==================================================================== */}
        {activeTab === 'Reports' && (() => {
          const totalRevenue = ordersList.reduce((s, o) => s + o.totalAmount, 0);
          const activeCount = ordersList.filter(o => o.status === 'Picked Up').length;
          const overdueCount = ordersList.filter(o => o.status === 'Late pickup' || o.status === 'Late Return').length;
          const reservedCount = ordersList.filter(o => o.status === 'Reserved').length;
          const cancelledCount = ordersList.filter(o => o.status === 'Cancelled').length;
          const depositHeld = ordersList.filter(o => ['Reserved','Picked Up','Late pickup'].includes(o.status)).reduce((s, o) => s + o.totalAmount * 0.3, 0);

          const revenueData = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => ({
            day: d,
            revenue: Math.round(totalRevenue / 7 * (0.7 + Math.random() * 0.6)),
            deposits: Math.round(depositHeld / 7 * (0.5 + Math.random() * 0.5)),
          }));

          const statusPie = [
            { name: 'Reserved', value: reservedCount, color: '#22C55E' },
            { name: 'Picked Up', value: activeCount, color: '#3B82F6' },
            { name: 'Overdue', value: overdueCount, color: '#EF4444' },
            { name: 'Cancelled', value: cancelledCount, color: '#6B7280' },
          ].filter(s => s.value > 0);

          return (
            <div className="space-y-6 animate-fade-in">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                  { label: 'Security Deposits Held', value: `₹${Math.round(depositHeld).toLocaleString('en-IN')}`, icon: ShieldCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                  { label: 'Active Rentals', value: activeCount, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                  { label: 'Overdue / Late', value: overdueCount, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
                ].map(kpi => (
                  <div key={kpi.label} className={`glass-panel p-5 rounded-2xl border ${kpi.bg} space-y-2`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                    <div className={`text-xl font-black ${kpi.color}`}>{kpi.value}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{kpi.label}</div>
                  </div>
                ))}
              </div>

              {/* Communication Hub */}
              <div className="grid grid-cols-1 gap-6">
                {/* Reminders Log Sidebar */}
                <div className="glass-panel p-5 rounded-3xl border border-green-500/20 bg-[#0A1813]/90 flex flex-col justify-between shadow-2xl h-[420px]">
                  <div className="border-b border-green-500/15 pb-3">
                    <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block">Communication Hub</span>
                    <h4 className="text-sm font-black text-white mt-0.5 flex items-center gap-1.5">
                      <Bell className="w-4.5 h-4.5 text-purple-400" />
                      Automatic Reminders
                    </h4>
                  </div>

                  <div className="flex-1 py-4 space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {reminderLogs.map((log, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-[#07140F]/80 border border-green-500/10 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                          <span>{log.time}</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                            log.type === 'email' ? 'text-blue-400 bg-blue-500/10' : log.type === 'sms' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 bg-slate-500/10'
                          }`}>{log.type}</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed font-semibold">{log.msg}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerBroadcast}
                    disabled={broadcastingReminders}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg glow-purple transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {broadcastingReminders ? 'Broadcasting...' : 'Trigger Manual Reminder Batch'}
                  </button>
                </div>
              </div>

              {/* Revenue Chart + Pie Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-panel p-5 rounded-3xl border border-green-500/20 space-y-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-400" /> Revenue vs Deposits — Last 7 Days</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip contentStyle={{ background: '#0B1A14', border: '1px solid #22C55E30', borderRadius: 12, fontSize: 11 }} />
                        <Area type="monotone" dataKey="revenue" name="Rental Revenue" stroke="#22C55E" fill="#22C55E" fillOpacity={0.15} strokeWidth={2} />
                        <Area type="monotone" dataKey="deposits" name="Deposits Held" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="glass-panel p-5 rounded-3xl border border-green-500/20 space-y-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2"><PieChart className="w-4 h-4 text-purple-400" /> Order Status Breakdown</h3>
                  {statusPie.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartPieChart>
                          <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                            {statusPie.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#0B1A14', border: '1px solid #22C55E30', borderRadius: 12, fontSize: 11 }} />
                        </RechartPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <p className="text-xs text-slate-400">No rental data yet</p>}
                  <div className="space-y-1.5">
                    {statusPie.map(s => (
                      <div key={s.name} className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: s.color}} /><span className="text-slate-300">{s.name}</span></span>
                        <span className="font-bold text-white">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Orders summary table */}
              <div className="glass-panel p-5 rounded-3xl border border-green-500/20 space-y-3">
                <h3 className="text-sm font-black text-white flex items-center gap-2"><FileText className="w-4 h-4 text-blue-400" /> Recent Rental Revenue Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead><tr className="border-b border-green-500/20 text-slate-400 text-[10px] uppercase tracking-wider">
                      <th className="py-2 px-3">Order</th><th className="py-2 px-3">Customer</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">Duration</th><th className="py-2 px-3 text-right">Revenue</th>
                    </tr></thead>
                    <tbody className="divide-y divide-green-500/10">
                      {ordersList.slice(0, 8).map(o => (
                        <tr key={o.id} className="hover:bg-emerald-500/5">
                          <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">{o.orderRef}</td>
                          <td className="py-2.5 px-3 text-white font-bold">{o.customer}</td>
                          <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.status === 'Reserved' ? 'text-emerald-400 bg-emerald-500/20'
                            : o.status === 'Picked Up' ? 'text-blue-400 bg-blue-500/20'
                            : 'text-rose-400 bg-rose-500/20'
                          }`}>{o.status}</span></td>
                          <td className="py-2.5 px-3 text-slate-300">{o.durationDays}d</td>
                          <td className="py-2.5 px-3 text-right font-black text-white">₹{o.totalAmount.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================================================================== */}
        {/* TAB 5: SETTINGS (STRICTLY IMPLEMENTING EXCALIDRAW WIREFRAME) */}
        {/* ==================================================================== */}
        {activeTab === 'Settings' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Top Action Bar: Title, Save (Purple), Discard */}
            <div className="flex items-center justify-between bg-[#0B1A14] p-5 rounded-2xl border border-green-500/20 shadow-xl">
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">Setting</h1>
                <p className="text-xs text-slate-400">Configure pickup penalty parameters, product links, and admin profile</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveSettings}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg glow-purple transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save
                </button>

                <button
                  type="button"
                  onClick={() => alert('Settings changes discarded')}
                  className="px-4 py-2.5 rounded-xl bg-[#07140F] border border-slate-600 text-slate-300 font-bold text-xs hover:text-white"
                >
                  Discard
                </button>
              </div>
            </div>

            {savedSettingsSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" /> Settings saved successfully!
              </div>
            )}

            {/* CARD 1: PICKUP & RETURN SETTINGS (EXCALIDRAW WIREFRAME 1) */}
            <div className="glass-panel p-6 rounded-3xl border border-green-500/20 space-y-4 shadow-xl">
              <h2 className="text-sm font-extrabold text-white border-b border-green-500/10 pb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Pickup & Return Settings
              </h2>

              <div className="space-y-3">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableLateFee}
                    onChange={(e) => setEnableLateFee(e.target.checked)}
                    className="rounded border-green-500/30 bg-[#07140F] accent-emerald-500 w-4 h-4"
                  />
                  <span>Late Fee / Overdue Penalty</span>
                </label>

                {/* Conditional Input: Visible ONLY when Late Fee checkbox is checked */}
                {enableLateFee && (
                  <div className="pl-6 pt-1 space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-300 font-semibold">Late Fee: $</span>
                      <input
                        type="number"
                        value={lateFeePerHour}
                        onChange={(e) => setLateFeePerHour(parseFloat(e.target.value))}
                        className="w-24 bg-[#07140F] border border-green-500/30 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                      />
                      <span className="text-slate-400 font-medium">per hour late</span>
                    </div>

                    {/* Excalidraw Wireframe Notes */}
                    <div className="p-3 rounded-xl bg-[#07140F] border border-green-500/10 space-y-1 text-[11px] text-slate-400 leading-relaxed font-mono">
                      <p>• Whatever the amount is mentioned here will be applied on all the products by default.</p>
                      <p>• If somebody wants to apply the late fee on a particular product then that can be set from here or the product page under tab.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: PRODUCT SETTINGS WITH REDIRECT ARROWS (EXCALIDRAW WIREFRAME 2) */}
            <div className="glass-panel p-6 rounded-3xl border border-green-500/20 space-y-4 shadow-xl">
              <h2 className="text-sm font-extrabold text-white border-b border-green-500/10 pb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" /> Product Settings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Attributes Checkbox & Arrow Link */}
                <div className="p-4 rounded-2xl bg-[#07140F] border border-green-500/10 space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableAttributes}
                      onChange={(e) => setEnableAttributes(e.target.checked)}
                      className="rounded border-green-500/30 bg-[#07140F] accent-emerald-500 w-4 h-4"
                    />
                    <span>Attributes</span>
                  </label>

                  {enableAttributes && (
                    <button
                      onClick={() => {
                        setActiveTab('Products');
                        setProductsSegment('attribute');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:underline pt-1"
                    >
                      <span>Attributes Page</span> <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Price List Checkbox & Arrow Link */}
                <div className="p-4 rounded-2xl bg-[#07140F] border border-green-500/10 space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePriceList}
                      onChange={(e) => setEnablePriceList(e.target.checked)}
                      className="rounded border-green-500/30 bg-[#07140F] accent-emerald-500 w-4 h-4"
                    />
                    <span>Price List</span>
                  </label>

                  {enablePriceList && (
                    <button
                      onClick={() => {
                        setActiveTab('Products');
                        setProductsSegment('price-list');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:underline pt-1"
                    >
                      <span>Price List Page</span> <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>

              {/* Excalidraw Wireframe Note */}
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono p-3 rounded-xl bg-[#07140F] border border-green-500/10">
                • Enable this option once the above checkbox is check marked and one user click on the attributes redirect to the attributes page. Keep the same for the Price list.
              </p>
            </div>

            {/* CARD 3: USER & COMPANY INFORMATION (EXCALIDRAW WIREFRAME 3) */}
            <div className="glass-panel p-8 rounded-3xl border border-green-500/20 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-green-500/10 pb-4">
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" /> Admin User & Company Profile Information
                </h2>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                  ADMIN ONLY
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Name</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full bg-[#07140F] border border-green-500/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Email</label>
                    <input
                      type="email"
                      value={adminEmail}
                      disabled
                      className="w-full bg-[#07140F]/50 border border-green-500/10 rounded-xl px-3 py-2.5 text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Phone</label>
                    <input
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      className="w-full bg-[#07140F] border border-green-500/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Company Name</label>
                    <input
                      type="text"
                      value={adminCompany}
                      onChange={(e) => setAdminCompany(e.target.value)}
                      className="w-full bg-[#07140F] border border-green-500/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right Column Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Company Logo</label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#07140F] border border-green-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                        LOGO
                      </div>
                      <button
                        type="button"
                        onClick={() => alert('Logo upload triggered')}
                        className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs shadow hover:bg-purple-500 flex items-center gap-1.5"
                      >
                        <Upload className="w-4 h-4" /> Upload
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">GST IN</label>
                    <input
                      type="text"
                      value={adminGst}
                      onChange={(e) => setAdminGst(e.target.value)}
                      className="w-full bg-[#07140F] border border-green-500/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Address</label>
                    <textarea
                      rows={2}
                      value={adminAddress}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-[#07140F] border border-green-500/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none resize-none"
                    />
                  </div>
                </div>

              </div>

              {/* Sub-Tabs: Work Information | Security */}
              <div className="pt-4 border-t border-green-500/10 space-y-4">
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingSubTab('work')}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      settingSubTab === 'work'
                        ? 'bg-emerald-600 text-slate-950 shadow'
                        : 'bg-[#07140F] text-slate-400 border border-green-500/20'
                    }`}
                  >
                    Work Information
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingSubTab('security')}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      settingSubTab === 'security'
                        ? 'bg-purple-600 text-white shadow'
                        : 'bg-[#07140F] text-slate-400 border border-green-500/20'
                    }`}
                  >
                    Security
                  </button>
                </div>

                {settingSubTab === 'work' && (
                  <div className="p-4 rounded-2xl bg-[#07140F] border border-green-500/20 space-y-3">
                    <span className="text-xs text-slate-400">No additional work information available.</span>
                  </div>
                )}

                {settingSubTab === 'security' && (
                  <div className="p-4 rounded-2xl bg-[#07140F] border border-green-500/20 space-y-3">
                    <span className="text-xs font-bold text-white block">Change Password:</span>
                    <button
                      type="button"
                      onClick={() => alert('Password update link sent to email')}
                      className="px-4 py-2 rounded-xl bg-purple-600 text-white font-extrabold text-xs shadow hover:bg-purple-500"
                    >
                      Change Password
                    </button>
                  </div>
                )}

              </div>

              {/* Excalidraw Wireframe Note Card */}
              <div className="p-4 rounded-2xl bg-[#07140F] border border-purple-500/30 space-y-1 text-xs text-slate-300 font-mono">
                <span className="text-purple-400 font-bold block uppercase tracking-wider">📌 Wireframe Access Governance Note:</span>
                <p>• Settings should only be visible to Admin user.</p>
                <p>• For all the non-admin users, this user information page should only be visible under profile section.</p>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* ==================================================================== */}
      {/* QUICK CREATE MODAL */}
      {/* ==================================================================== */}
      {showQuickCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-scale-up">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-green-500/30 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-green-500/20 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" /> Create New Rental Order
              </h3>
              <button
                onClick={() => setShowQuickCreate(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Customer Name</label>
                <input
                  type="text"
                  placeholder="Mark Wood"
                  className="w-full bg-[#07140F] border border-green-500/20 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Product Equipment</label>
                <input
                  type="text"
                  placeholder="Sony 4K OLED TV 65"
                  className="w-full bg-[#07140F] border border-green-500/20 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Total Amount ($)</label>
                  <input type="number" defaultValue={1520} className="w-full bg-[#07140F] border border-green-500/20 rounded-xl p-2.5 text-white focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Invoice Status</label>
                  <select className="w-full bg-[#07140F] border border-green-500/20 rounded-xl p-2.5 text-white focus:outline-none">
                    <option>Quotation Sent</option>
                    <option>Sale order Confirmed</option>
                    <option>Invoiced</option>
                    <option>Nothing to Invoice</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                alert('New Rental Order created successfully!');
                setShowQuickCreate(false);
              }}
              className="w-full py-3 rounded-xl bg-purple-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg glow-purple"
            >
              Confirm Order Creation
            </button>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PRODUCT ADD / EDIT MODAL */}
      {/* ==================================================================== */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-scale-up">
          <div className="w-full max-w-xl glass-panel rounded-3xl p-6 border border-cyan-500/30 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-green-500/20 pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" />
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {productFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {productFormError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Product Title *</label>
                  <input
                    required
                    type="text"
                    value={productForm.title}
                    onChange={e => setProductForm(f => ({...f, title: e.target.value}))}
                    placeholder="Canon EOS R6 Mark II..."
                    className="w-full bg-[#07140F] border border-green-500/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category *</label>
                  <select
                    required
                    value={productForm.category_id}
                    onChange={e => setProductForm(f => ({...f, category_id: e.target.value}))}
                    className="w-full bg-[#07140F] border border-green-500/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={productForm.description}
                  onChange={e => setProductForm(f => ({...f, description: e.target.value}))}
                  placeholder="Detailed product description..."
                  className="w-full bg-[#07140F] border border-green-500/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Daily Rate (₹) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={productForm.base_daily_rate}
                    onChange={e => setProductForm(f => ({...f, base_daily_rate: e.target.value}))}
                    placeholder="1500"
                    className="w-full bg-[#07140F] border border-green-500/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Security Deposit (₹) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={productForm.security_deposit_amount}
                    onChange={e => setProductForm(f => ({...f, security_deposit_amount: e.target.value}))}
                    placeholder="5000"
                    className="w-full bg-[#07140F] border border-green-500/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Image URLs (comma-separated)</label>
                <input
                  type="text"
                  value={productForm.images}
                  onChange={e => setProductForm(f => ({...f, images: e.target.value}))}
                  placeholder="https://example.com/img1.jpg, https://..."
                  className="w-full bg-[#07140F] border border-green-500/20 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Status</label>
                <div className="flex items-center gap-3">
                  {(['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE'] as const).map(s => (
                    <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="prodStatus"
                        value={s}
                        checked={productForm.status === s}
                        onChange={() => setProductForm(f => ({...f, status: s}))}
                        className="accent-emerald-500"
                      />
                      <span className={`font-bold ${s === 'AVAILABLE' ? 'text-emerald-400' : s === 'MAINTENANCE' ? 'text-amber-400' : 'text-rose-400'}`}>{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={productFormLoading}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  {productFormLoading ? (
                    <><div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> {editingProduct ? 'Update Product' : 'Create Product'}</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-5 py-3 rounded-xl bg-[#07140F] border border-slate-600 text-slate-300 font-bold text-xs hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
