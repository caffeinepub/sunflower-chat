import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Time "mo:core/Time";

module {
  type UserId = Text;
  type SessionId = Text;
  type Email = Text;
  type MessageId = Text;
  type ConversationId = Text;

  type OldUser = {
    id : UserId;
    username : Text;
    email : Email;
    avatarColor : ?Text;
  };

  type OldMessage = {
    id : MessageId;
    senderId : UserId;
    senderName : Text;
    content : Text;
    timestamp : Time.Time;
  };

  type OldConversation = {
    id : ConversationId;
    participantIds : [UserId];
    messages : List.List<OldMessage>;
  };

  type OldActor = {
    users : Map.Map<UserId, OldUser>;
    sessions : Map.Map<SessionId, UserId>;
    conversations : Map.Map<ConversationId, OldConversation>;
    emailToUserId : Map.Map<Email, UserId>;
    nextId : Nat;
  };

  type NewUser = {
    id : UserId;
    username : Text;
    email : Email;
    avatarColor : ?Text;
    isPublic : Bool;
    hideLastSeen : Bool;
    lastSeen : Time.Time;
  };

  type NewMessage = {
    id : MessageId;
    senderId : UserId;
    senderName : Text;
    content : Text;
    timestamp : Time.Time;
    edited : Bool;
    deleted : Bool;
    replyToId : ?Text;
    replyPreview : ?Text;
    messageType : Text;
    reactions : Text;
  };

  type NewConversation = {
    id : ConversationId;
    participantIds : [UserId];
    messages : List.List<NewMessage>;
    isPinned : Bool;
    isGroup : Bool;
    groupName : ?Text;
  };

  type NewActor = {
    users : Map.Map<UserId, NewUser>;
    sessions : Map.Map<SessionId, UserId>;
    conversations : Map.Map<ConversationId, NewConversation>;
    emailToUserId : Map.Map<Email, UserId>;
    nextId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let newUsers = old.users.map<UserId, OldUser, NewUser>(
      func(_id, oldUser) {
        {
          oldUser with
          isPublic = true;
          hideLastSeen = false;
          lastSeen = Time.now();
        };
      }
    );

    let newConversations = old.conversations.map<ConversationId, OldConversation, NewConversation>(
      func(_id, oldConv) {
        {
          oldConv with
          messages = oldConv.messages.map<OldMessage, NewMessage>(
            func(oldMsg) {
              {
                oldMsg with
                edited = false;
                deleted = false;
                replyToId = null;
                replyPreview = null;
                messageType = "text";
                reactions = "";
              };
            }
          );
          isPinned = false;
          isGroup = false;
          groupName = null;
        };
      }
    );

    {
      users = newUsers;
      sessions = old.sessions;
      conversations = newConversations;
      emailToUserId = old.emailToUserId;
      nextId = old.nextId;
    };
  };
};
