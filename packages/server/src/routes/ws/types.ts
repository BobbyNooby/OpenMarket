export type WsMessageOut =
  | {
      type: "new_message";
      data: {
        id: string;
        conversation_id: string;
        sender_id: string;
        content: string;
        created_at: string;
        edited_at: string | null;
        is_deleted: boolean;
        sender: {
          user_id: string;
          username: string;
          display_name: string;
          avatar: string | null;
        };
      };
    }
  | { type: "typing"; data: { conversation_id: string; user_id: string } }
  | { type: "stop_typing"; data: { conversation_id: string; user_id: string } }
  | {
      type: "message_deleted";
      data: { message_id: string; conversation_id: string };
    }
  | {
      type: "notification";
      data: {
        id: string;
        type: string;
        title: string;
        body: string | null;
        link: string | null;
        is_read: boolean;
        created_at: string;
      };
    }
  | { type: "pong" };

export type WsMessageIn =
  | { type: "ping" }
  | { type: "typing"; data: { conversation_id: string } }
  | { type: "stop_typing"; data: { conversation_id: string } };
