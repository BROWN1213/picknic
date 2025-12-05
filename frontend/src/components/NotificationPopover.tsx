import { useState } from "react";
import { Bell } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  voteId?: string;
  isRead: boolean;
}

interface NotificationPopoverProps {
  notifications: Notification[];
  onNotificationClick: (voteId: string) => void;
  onMarkAsRead: (notificationId: string) => void;
}

export function NotificationPopover({
  notifications,
  onNotificationClick,
  onMarkAsRead,
}: NotificationPopoverProps) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const [open, setOpen] = useState(false);

  const handleNotificationClick = (voteId: string, notificationId: string) => {
    onNotificationClick(voteId);
    onMarkAsRead(notificationId);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-white hover:bg-white/10 active:bg-white/20"
        onClick={() => setOpen(true)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white border-0 text-xs">
            {unreadCount}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw] w-full sm:max-w-md h-[500px] flex flex-col overflow-hidden bg-zinc-900 border-zinc-700 text-white gap-0 p-0 top-[15%] translate-y-0">
          <DialogHeader className="p-4 border-b border-zinc-700 shrink-0">
            <DialogTitle className="text-foreground text-left">알림</DialogTitle>
            <DialogDescription className="text-xs text-lime-400 text-left">
              {unreadCount > 0 ? `${unreadCount}개의 새로운 알림` : '최근 알림 내역'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-1 bg-zinc-900">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                알림이 없습니다
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => {
                      if (notification.voteId) {
                        handleNotificationClick(notification.voteId, notification.id);
                      }
                    }}
                    className={`w-full p-4 text-left border-b border-zinc-800 hover:bg-zinc-700/50 active:bg-zinc-700 transition-colors ${
                      !notification.isRead 
                        ? "bg-zinc-800/80" 
                        : "bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                          !notification.isRead ? "bg-lime-500" : "bg-zinc-600"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white mb-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-zinc-400 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
