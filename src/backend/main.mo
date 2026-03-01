import Time "mo:core/Time";
import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Migration "migration";
import Int "mo:core/Int";

(with migration = Migration.run)
actor {
  type UserId = Text;
  type SessionId = Text;
  type Email = Text;
  type HashedPassword = Text;
  type MessageId = Text;
  type ConversationId = Text;

  type User = {
    id : UserId;
    username : Text;
    email : Email;
    avatarColor : ?Text;
    isPublic : Bool;
    hideLastSeen : Bool;
    lastSeen : Time.Time;
  };

  type Message = {
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

  type Conversation = {
    id : ConversationId;
    participantIds : [UserId];
    messages : List.List<Message>;
    isPinned : Bool;
    isGroup : Bool;
    groupName : ?Text;
  };

  public type Profile = {
    id : UserId;
    username : Text;
    email : Email;
    avatarColor : ?Text;
    isPublic : Bool;
    hideLastSeen : Bool;
    lastSeen : Time.Time;
  };

  public type MessageView = {
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

  public type ConversationView = {
    id : ConversationId;
    participantIds : [UserId];
    messages : [MessageView];
    isPinned : Bool;
    isGroup : Bool;
    groupName : ?Text;
  };

  module User {
    public func compareByLastSeen(a : User, b : User) : Order.Order {
      Int.compare(b.lastSeen, a.lastSeen);
    };
  };

  module Message {
    public func toMessageView(message : Message) : MessageView {
      {
        id = message.id;
        senderId = message.senderId;
        senderName = message.senderName;
        content = message.content;
        timestamp = message.timestamp;
        edited = message.edited;
        deleted = message.deleted;
        replyToId = message.replyToId;
        replyPreview = message.replyPreview;
        messageType = message.messageType;
        reactions = message.reactions;
      };
    };
  };

  let users = Map.empty<UserId, User>();
  let sessions = Map.empty<SessionId, UserId>();
  let conversations = Map.empty<ConversationId, Conversation>();
  let emailToUserId = Map.empty<Email, UserId>();
  var nextId = 0;

  func generateId() : Text {
    let id = nextId;
    nextId += 1;
    id.toText();
  };

  func hashPassword(password : Text) : HashedPassword {
    password;
  };

  func validateUser(sessionId : SessionId) : UserId {
    switch (sessions.get(sessionId)) {
      case (?userId) { userId };
      case (null) { Runtime.trap("Invalid session") };
    };
  };

  public shared ({ caller }) func register(username : Text, email : Text, password : Text) : async () {
    if (emailToUserId.containsKey(email)) {
      Runtime.trap("Email already in use");
    };

    let userId = generateId();
    let user : User = {
      id = userId;
      username;
      email;
      avatarColor = null;
      isPublic = true;
      hideLastSeen = false;
      lastSeen = Time.now();
    };

    users.add(userId, user);
    emailToUserId.add(email, userId);
    sessions.add(generateId(), userId);
  };

  public shared ({ caller }) func login(email : Text, password : Text) : async SessionId {
    switch (emailToUserId.get(email)) {
      case (?userId) {
        let sessionId = generateId();
        sessions.add(sessionId, userId);
        sessionId;
      };
      case (null) { Runtime.trap("Invalid credentials") };
    };
  };

  public query ({ caller }) func getProfile(sessionId : SessionId) : async Profile {
    let userId = validateUser(sessionId);
    switch (users.get(userId)) {
      case (?user) {
        {
          id = user.id;
          username = user.username;
          email = user.email;
          avatarColor = user.avatarColor;
          isPublic = user.isPublic;
          hideLastSeen = user.hideLastSeen;
          lastSeen = user.lastSeen;
        };
      };
      case (null) { Runtime.trap("User does not exist") };
    };
  };

  public shared ({ caller }) func updateProfile(
    sessionId : SessionId,
    username : Text,
    avatarColor : ?Text,
    isPublic : Bool,
    hideLastSeen : Bool,
  ) : async () {
    let userId = validateUser(sessionId);
    switch (users.get(userId)) {
      case (?user) {
        let updatedUser : User = {
          user with
          username;
          avatarColor;
          isPublic;
          hideLastSeen;
        };
        users.add(userId, updatedUser);
      };
      case (null) { Runtime.trap("User does not exist") };
    };
  };

  public shared ({ caller }) func updateLastSeen(sessionId : SessionId) : async () {
    let userId = validateUser(sessionId);
    switch (users.get(userId)) {
      case (?user) {
        let updatedUser : User = {
          user with
          lastSeen = Time.now();
        };
        users.add(userId, updatedUser);
      };
      case (null) { Runtime.trap("User does not exist") };
    };
  };

  public shared ({ caller }) func createConversation(sessionId : SessionId, participantUsername : Text) : async ConversationId {
    let userId = validateUser(sessionId);

    var participantId : ?UserId = null;
    for ((id, user) in users.entries()) {
      if (user.username == participantUsername) {
        participantId := ?id;
      };
    };

    switch (participantId) {
      case (?pid) {
        var existingConversationId : ?ConversationId = null;
        for ((cid, conv) in conversations.entries()) {
          if (conv.participantIds.size() == 2 and
              conv.participantIds.values().all(func(p) { userId == p or pid == p })) {
            existingConversationId := ?cid;
          };
        };

        switch (existingConversationId) {
          case (?cid) { cid };
          case (null) {
            let conversationId = generateId();
            let conversation : Conversation = {
              id = conversationId;
              participantIds = [userId, pid];
              messages = List.empty<Message>();
              isPinned = false;
              isGroup = false;
              groupName = null;
            };
            conversations.add(conversationId, conversation);
            conversationId;
          };
        };
      };
      case (null) { Runtime.trap("Participant not found") };
    };
  };

  public shared ({ caller }) func createGroupConversation(
    sessionId : SessionId,
    groupName : Text,
    participantUsernames : [Text],
  ) : async ConversationId {
    let userId = validateUser(sessionId);

    let participants : List.List<UserId> = List.empty<UserId>();
    participants.add(userId);

    for (username in participantUsernames.values()) {
      for ((_id, user) in users.entries()) {
        if (user.username == username) {
          participants.add(user.id);
        };
      };
    };

    let conversationId = generateId();
    let conversation : Conversation = {
      id = conversationId;
      participantIds = participants.toArray();
      messages = List.empty<Message>();
      isPinned = false;
      isGroup = true;
      groupName = ?groupName;
    };

    conversations.add(conversationId, conversation);
    conversationId;
  };

  public shared ({ caller }) func pinConversation(sessionId : SessionId, conversationId : ConversationId, pinned : Bool) : async () {
    let _ = validateUser(sessionId);
    switch (conversations.get(conversationId)) {
      case (?conv) {
        let updatedConv : Conversation = {
          conv with
          isPinned = pinned;
        };
        conversations.add(conversationId, updatedConv);
      };
      case (null) { Runtime.trap("Conversation does not exist") };
    };
  };

  public query ({ caller }) func getConversations(sessionId : SessionId) : async [ConversationView] {
    let userId = switch (sessions.get(sessionId)) {
      case (?userId) { userId };
      case (null) { Runtime.trap("Invalid session") };
    };

    let filteredConversations = conversations.values().toArray().filter(
      func(conv) {
        conv.participantIds.values().any(func(pid) { pid == userId });
      }
    );

    filteredConversations.map(func(conv) {
      {
        id = conv.id;
        participantIds = conv.participantIds;
        messages = conv.messages.toArray().map(Message.toMessageView);
        isPinned = conv.isPinned;
        isGroup = conv.isGroup;
        groupName = conv.groupName;
      }
    });
  };

  public shared ({ caller }) func sendMessage(
    sessionId : SessionId,
    conversationId : ConversationId,
    content : Text,
    replyToId : ?Text,
    replyPreview : ?Text,
    messageType : Text,
  ) : async () {
    let senderId = validateUser(sessionId);

    switch (conversations.get(conversationId), users.get(senderId)) {
      case (?conversation, ?sender) {
        let message : Message = {
          id = generateId();
          senderId;
          senderName = sender.username;
          content;
          timestamp = Time.now();
          edited = false;
          deleted = false;
          replyToId;
          replyPreview;
          messageType;
          reactions = "";
        };
        conversation.messages.add(message);
      };
      case (null, _) { Runtime.trap("Conversation does not exist") };
      case (_, null) { Runtime.trap("Sender does not exist") };
    };
  };

  public shared ({ caller }) func editMessage(
    sessionId : SessionId,
    conversationId : ConversationId,
    messageId : MessageId,
    newContent : Text,
  ) : async () {
    let userId = validateUser(sessionId);

    switch (conversations.get(conversationId)) {
      case (?conversation) {
        let messagesArray = conversation.messages.toArray();
        let updatedMessages = messagesArray.map(
          func(msg) {
            if (msg.id == messageId and msg.senderId == userId) {
              {
                msg with
                content = newContent;
                edited = true;
              };
            } else { msg };
          }
        );
        conversation.messages.clear();
        conversation.messages.addAll(updatedMessages.values());
      };
      case (null) { Runtime.trap("Conversation does not exist") };
    };
  };

  public shared ({ caller }) func deleteMessageForEveryone(
    sessionId : SessionId,
    conversationId : ConversationId,
    messageId : MessageId,
  ) : async () {
    let userId = validateUser(sessionId);

    switch (conversations.get(conversationId)) {
      case (?conversation) {
        let messagesArray = conversation.messages.toArray();
        let updatedMessages = messagesArray.map(
          func(msg) {
            if (msg.id == messageId and msg.senderId == userId) {
              {
                msg with
                content = "";
                deleted = true;
              };
            } else { msg };
          }
        );
        conversation.messages.clear();
        conversation.messages.addAll(updatedMessages.values());
      };
      case (null) { Runtime.trap("Conversation does not exist") };
    };
  };

  public shared ({ caller }) func reactToMessage(
    sessionId : SessionId,
    conversationId : ConversationId,
    messageId : MessageId,
    emoji : Text,
  ) : async () {
    ignore validateUser(sessionId);

    switch (conversations.get(conversationId)) {
      case (?conversation) {
        let messagesArray = conversation.messages.toArray();
        let updatedMessages = messagesArray.map(
          func(msg) {
            if (msg.id == messageId) {
              { msg with reactions = msg.reactions # emoji };
            } else { msg };
          }
        );
        conversation.messages.clear();
        conversation.messages.addAll(updatedMessages.values());
      };
      case (null) { Runtime.trap("Conversation does not exist") };
    };
  };

  public query ({ caller }) func getMessages(
    sessionId : SessionId,
    conversationId : ConversationId,
    page : Nat,
    pageSize : Nat,
  ) : async [MessageView] {
    ignore switch (sessions.get(sessionId)) {
      case (?_) { () };
      case (null) { Runtime.trap("Invalid session") };
    };

    switch (conversations.get(conversationId)) {
      case (?conversation) {
        let totalMessages = conversation.messages.size();
        let start = page * pageSize;
        if (start >= totalMessages) {
          return [];
        };
        let messagesArray = conversation.messages.toArray();
        let reversed = messagesArray.reverse();
        let end = if (start + pageSize > totalMessages) {
          totalMessages;
        } else {
          start + pageSize;
        };
        let paginated = reversed.sliceToArray(start, end);
        paginated.map(Message.toMessageView);
      };
      case (null) { Runtime.trap("Conversation does not exist") };
    };
  };

  public shared ({ caller }) func broadcastMessage(
    sessionId : SessionId,
    participantUsernames : [Text],
    content : Text,
  ) : async () {
    let userId = validateUser(sessionId);

    for (username in participantUsernames.values()) {
      var participantId : ?UserId = null;
      for ((_id, user) in users.entries()) {
        if (user.username == username) {
          participantId := ?user.id;
        };
      };

      switch (participantId) {
        case (?pid) {
          let conversationId = await createConversation(sessionId, username);
          await sendMessage(sessionId, conversationId, content, null, null, "text");
        };
        case (null) { () };
      };
    };
  };

  public shared ({ caller }) func seedSampleData() : async () {
    let alice : User = {
      id = "0";
      username = "Alice";
      email = "alice@test.com";
      avatarColor = ?"ff0000";
      isPublic = true;
      hideLastSeen = false;
      lastSeen = Time.now();
    };
    let bob : User = {
      id = "1";
      username = "Bob";
      email = "bob@test.com";
      avatarColor = ?"00ff00";
      isPublic = true;
      hideLastSeen = false;
      lastSeen = Time.now();
    };
    let charlie : User = {
      id = "2";
      username = "Charlie";
      email = "charlie@test.com";
      avatarColor = ?"0000ff";
      isPublic = true;
      hideLastSeen = false;
      lastSeen = Time.now();
    };

    users.add(alice.id, alice);
    users.add(bob.id, bob);
    users.add(charlie.id, charlie);

    let message1 : Message = {
      id = "0";
      senderId = alice.id;
      senderName = "Alice";
      content = "Hi Bob!";
      timestamp = Time.now();
      edited = false;
      deleted = false;
      replyToId = null;
      replyPreview = null;
      messageType = "text";
      reactions = "";
    };
    let message2 : Message = {
      id = "1";
      senderId = bob.id;
      senderName = "Bob";
      content = "Hey Alice!";
      timestamp = Time.now();
      edited = false;
      deleted = false;
      replyToId = null;
      replyPreview = null;
      messageType = "text";
      reactions = "";
    };

    let conversation : Conversation = {
      id = "0";
      participantIds = ["0", "1"];
      messages = List.fromArray([message1, message2]);
      isPinned = false;
      isGroup = false;
      groupName = null;
    };

    conversations.add("0", conversation);
  };
};
