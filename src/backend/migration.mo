import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Iter "mo:core/Iter";

module {
  type UserId = Text;
  type SessionId = Text;
  type Email = Text;
  type Mobile = Text;
  type MessageId = Text;
  type ConversationId = Text;

  type OldUser3 = {
    id : UserId;
    username : Text;
    email : ?Email;
    mobile : ?Mobile;
    avatarColor : ?Text;
    isPublic : Bool;
    hideLastSeen : Bool;
    lastSeen : Time.Time;
  };

  type OldMessage = {
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

  type OldConversation = {
    id : ConversationId;
    participantIds : [UserId];
    messages : List.List<OldMessage>;
    isPinned : Bool;
    isGroup : Bool;
    groupName : ?Text;
  };

  type OldActor = {
    users : Map.Map<UserId, OldUser3>;
    sessions : Map.Map<SessionId, UserId>;
    conversations : Map.Map<ConversationId, OldConversation>;
    emailToUserId : Map.Map<Email, UserId>;
    mobileToUserId : Map.Map<Mobile, UserId>;
    otps : Map.Map<Text, { code : Text; expiresAt : Time.Time }>;
    nextId : Nat;
  };

  type NewUser3 = {
    id : UserId;
    username : Text;
    email : ?Email;
    mobile : ?Mobile;
    avatarColor : ?Text;
    isPublic : Bool;
    hideLastSeen : Bool;
    lastSeen : Time.Time;
    passwordHash : ?Text;
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
    users : Map.Map<UserId, NewUser3>;
    sessions : Map.Map<SessionId, UserId>;
    conversations : Map.Map<ConversationId, NewConversation>;
    emailToUserId : Map.Map<Email, UserId>;
    mobileToUserId : Map.Map<Mobile, UserId>;
    otps : Map.Map<Text, { code : Text; expiresAt : Time.Time }>;
    nextId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let newUsers = old.users.map<UserId, OldUser3, NewUser3>(
      func(_id, oldUser) {
        { oldUser with passwordHash = null };
      }
    );
    { old with users = newUsers };
  };
};
