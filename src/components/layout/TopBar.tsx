import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Search, Command, CheckCircle2, AlertTriangle, MessageSquare, Loader2, Menu } from "lucide-react";
import { useAppStore, Notification as AppNotification } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

export function TopBar() {
  const { user, toggleSidebar } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = (await res.json()) as AppNotification[];
          setNotifications(data);
        }
      } catch (error) {
        console.error("Failed to fetch notifications");
      }
    };

    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAllAsRead = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications", { method: "POST" });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success("All caught up!");
      }
    } catch (error) {
      toast.error("Failed to update notifications");
    } finally {
      setIsLoading(false);
      setShowNotifications(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header
      className="fixed top-0 lg:left-64 left-0 right-0 z-40 flex items-center justify-between px-6 lg:px-8 h-20 bg-black border-b-2 border-white/20"
    >
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Toggle */}
        <button 
          onClick={toggleSidebar}
          className="lg:hidden w-10 h-10 bg-black border-2 border-white/20 flex items-center justify-center text-white brutal-shadow-sm"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-black border-2 border-white/20 text-slate-400 brutal-shadow-sm cursor-pointer group hover:bg-[#111]">
           <Search className="w-4 h-4 text-primary" />
           <span className="text-xs font-bold font-mono uppercase tracking-tight">Search platform...</span>
           <div className="flex items-center gap-1 ml-8 px-2 py-0.5 bg-black border-2 border-white/20 text-[9px] font-black tracking-widest text-primary font-mono">
              <Command className="w-2.5 h-2.5" /> K
           </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Notifications */}
        <div className="relative">
           <button 
             onClick={() => setShowNotifications(!showNotifications)}
             className="relative w-10 h-10 bg-black border-2 border-white/20 flex items-center justify-center text-white hover:border-white transition-all brutal-shadow-sm"
           >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary border border-black" />
              )}
           </button>

           <AnimatePresence>
             {showNotifications && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                 <motion.div
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                   transition={{ duration: 0.2 }}
                   className="absolute right-0 mt-4 w-80 md:w-96 bg-black border-4 border-white/20 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] z-50 overflow-hidden"
                 >
                    <div className="p-4 border-b-2 border-white/20 flex items-center justify-between bg-[#111]">
                       <h4 className="font-bold text-white font-mono uppercase tracking-tight">Notifications</h4>
                       {unreadCount > 0 && (
                         <span className="text-[10px] font-black uppercase tracking-widest text-black bg-primary px-2 py-1">
                           {unreadCount} New
                         </span>
                       )}
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto">
                       {notifications.length === 0 ? (
                         <div className="p-12 text-center bg-black">
                            <Bell className="w-8 h-8 text-white/20 mx-auto mb-3" />
                            <p className="text-xs font-bold text-slate-500 font-mono uppercase">No notifications</p>
                         </div>
                       ) : (
                         notifications.map((notif) => {
                           const Icon = notif.type === 'interview' ? CheckCircle2 : notif.type === 'coding' ? MessageSquare : AlertTriangle;
                           return (
                             <div key={notif.id} className={cn(
                               "p-4 border-b-2 border-white/10 hover:bg-[#111] transition-colors cursor-pointer flex gap-4",
                               !notif.isRead ? "bg-white/[0.02]" : "bg-black"
                             )}>
                                <div className={cn(
                                  "w-10 h-10 border-2 flex-shrink-0 flex items-center justify-center",
                                  !notif.isRead ? "border-primary bg-primary/10 text-primary" : "border-white/20 text-slate-500"
                                )}>
                                   <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                   <p className={cn("text-sm mb-1 truncate font-mono font-bold", notif.isRead ? "text-slate-400" : "text-white")}>{notif.title}</p>
                                   <p className="text-xs text-slate-500 leading-relaxed mb-2 line-clamp-2">{notif.message}</p>
                                   <p className="text-[10px] font-black uppercase tracking-widest text-primary font-mono">
                                     {new Date(notif.createdAt).toLocaleDateString()}
                                   </p>
                                </div>
                             </div>
                           );
                         })
                       )}
                    </div>
                    
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        disabled={isLoading}
                        className="w-full p-4 text-center bg-primary text-black disabled:opacity-50 border-t-2 border-white/20 font-bold font-mono uppercase tracking-tight hover:bg-white transition-colors"
                      >
                         {isLoading ? (
                           <Loader2 className="w-4 h-4 animate-spin mx-auto text-black" />
                         ) : (
                           "Mark all as read"
                         )}
                      </button>
                    )}
                 </motion.div>
               </>
             )}
           </AnimatePresence>
        </div>

        {/* User Profile Summary */}
        <div className="flex items-center gap-4 pl-6 border-l-2 border-white/20">
           <div className="hidden md:block text-right">
              <p className="text-xs font-black text-white font-mono uppercase">{user?.name}</p>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest font-mono">Master Level</p>
           </div>
           <div className="w-10 h-10 border-2 border-white/20 bg-primary flex items-center justify-center font-black text-black text-sm brutal-shadow-sm overflow-hidden">
              {user?.image ? (
                <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover grayscale" />
              ) : (
                user?.name?.[0] || "U"
              )}
           </div>
        </div>
      </div>
    </header>
  );
}
