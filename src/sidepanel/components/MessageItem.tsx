import type { UnifiedMessage } from "@/services/types";

interface MessageItemProps {
  message: UnifiedMessage;
}

export function MessageItem({ message }: MessageItemProps): React.JSX.Element {
  const handleClick = (): void => {
    chrome.tabs.create({ url: message.deepLink });
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors group"
    >
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {message.senderAvatar ? (
            <img
              src={message.senderAvatar}
              alt=""
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-500">
                {message.sender.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs truncate ${
                message.isUnread
                  ? "font-semibold text-gray-900"
                  : "font-medium text-gray-600"
              }`}
            >
              {message.sender}
            </span>
            <span className="text-[10px] text-gray-400 flex-shrink-0">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          {message.channelName && (
            <p className="text-[10px] text-gray-400 truncate">
              #{message.channelName}
            </p>
          )}
          <p
            className={`text-xs truncate mt-0.5 ${
              message.isUnread ? "text-gray-700" : "text-gray-500"
            }`}
          >
            {message.content}
          </p>
        </div>

        {/* Unread dot */}
        {message.isUnread && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
        )}
      </div>
    </button>
  );
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}
