import Map "mo:core/Map";
import List "mo:core/List";
import Iter "mo:core/Iter";

module {
  type OldActor = {
    users : Map.Map<Text, OldUser>;
    conversations : Map.Map<Text, OldConversation>;
    emailToUserId : Map.Map<Text, Text>;
    sessions : Map.Map<Text, Text>;
    nextId : Nat;
  };

  type OldUser = {
    id : Text;
    username : Text;
    email : Text;
    avatarColor : ?Text;
    isPublic : Bool;
    hideLastSeen : Bool;
    lastSeen : Int;
  };

  type OldConversation = {
    id : Text;
    participantIds : [Text];
    messages : List.List<OldMessage>;
    isPinned : Bool;
    isGroup : Bool;
    groupName : ?Text;
  };

  type OldMessage = {
    id : Text;
    senderId : Text;
    senderName : Text;
    content : Text;
    timestamp : Int;
    edited : Bool;
    deleted : Bool;
    replyToId : ?Text;
    replyPreview : ?Text;
    messageType : Text;
    reactions : Text;
  };

  type NewActor = {
    users : Map.Map<Text, NewUser>;
    conversations : Map.Map<Text, OldConversation>;
    emailToUserId : Map.Map<Text, Text>;
    sessions : Map.Map<Text, Text>;
    nextId : Nat;
    mobileToUserId : Map.Map<Text, Text>;
    otps : Map.Map<Text, { code : Text; expiresAt : Int }>;
  };

  type NewUser = {
    id : Text;
    username : Text;
    email : ?Text;
    mobile : ?Text;
    avatarColor : ?Text;
    isPublic : Bool;
    hideLastSeen : Bool;
    lastSeen : Int;
  };

  public func run(old : OldActor) : NewActor {
    let newUsers = old.users.map<Text, OldUser, NewUser>(
      func(_id, oldUser) {
        {
          oldUser with
          email = ?oldUser.email;
          mobile = null;
        };
      }
    );

    {
      old with
      users = newUsers;
      mobileToUserId = Map.empty<Text, Text>();
      otps = Map.empty<Text, { code : Text; expiresAt : Int }>();
    };
  };
};
