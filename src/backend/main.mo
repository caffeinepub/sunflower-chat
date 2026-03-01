import Time "mo:core/Time";
import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Order "mo:core/Order";



actor {
  type UserId = Text;
  type SessionId = Text;
  type Email = Text;
  type HashedPassword = Text;

  type User = {
    id : UserId;
    username : Text;
    email : Email;
    avatarColor : ?Text;
  };

  type Message = {
    id : Text;
    senderId : UserId;
    senderName : Text;
    content : Text;
    timestamp : Time.Time;
  };

  type Conversation = {
    id : Text;
    participantIds : [UserId];
    messages : List.List<Message>;
  };

  public type ConversationView = {
    id : Text;
    participantIds : [UserId];
    messages : [Message];
  };

  module User {
    public func compareByUsername(user1 : User, user2 : User) : Order.Order {
      Text.compare(user1.username, user2.username);
    };
  };

  let users = Map.empty<UserId, User>();
  let sessions = Map.empty<SessionId, UserId>();
  let conversations = Map.empty<Text, Conversation>();
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

  public type Profile = {
    id : UserId;
    username : Text;
    email : Email;
    avatarColor : ?Text;
  };

  public query ({ caller }) func getProfile(sessionId : SessionId) : async Profile {
    let userId = switch (sessions.get(sessionId)) {
      case (null) { Runtime.trap("Invalid session") };
      case (?userId) { userId };
    };
    switch (users.get(userId)) {
      case (?user) {
        {
          id = user.id;
          username = user.username;
          email = user.email;
          avatarColor = user.avatarColor;
        };
      };
      case (null) { Runtime.trap("User does not exist") };
    };
  };

  public shared ({ caller }) func updateProfile(sessionId : SessionId, username : Text, avatarColor : ?Text) : async () {
    let userId = switch (sessions.get(sessionId)) {
      case (null) { Runtime.trap("Invalid session") };
      case (?userId) { userId };
    };
    switch (users.get(userId)) {
      case (?user) {
        let updatedUser : User = {
          user with
          username;
          avatarColor;
        };
        users.add(userId, updatedUser);
      };
      case (null) { Runtime.trap("User does not exist") };
    };
  };

  public shared ({ caller }) func createConversation(sessionId : SessionId, participantUsername : Text) : async Text {
    let userId = switch (sessions.get(sessionId)) {
      case (null) { Runtime.trap("Invalid session") };
      case (?userId) { userId };
    };

    var foundParticipantId : ?UserId = null;
    for ((id, user) in users.entries()) {
      if (user.username == participantUsername) {
        foundParticipantId := ?id;
      };
    };

    switch (foundParticipantId) {
      case (?participantId) {
        let conversationId = generateId();
        let conversation : Conversation = {
          id = conversationId;
          participantIds = [userId, participantId];
          messages = List.empty<Message>();
        };
        conversations.add(conversationId, conversation);
        conversationId;
      };
      case (null) { Runtime.trap("Participant not found") };
    };
  };

  public shared ({ caller }) func sendMessage(sessionId : SessionId, conversationId : Text, content : Text) : async () {
    let senderId = switch (sessions.get(sessionId)) {
      case (null) { Runtime.trap("Invalid session") };
      case (?senderId) { senderId };
    };

    switch (conversations.get(conversationId), users.get(senderId)) {
      case (?conversation, ?sender) {
        let message : Message = {
          id = generateId();
          senderId;
          senderName = sender.username;
          content;
          timestamp = Time.now();
        };
        conversation.messages.add(message);
      };
      case (null, _) { Runtime.trap("Conversation does not exist") };
      case (_, null) { Runtime.trap("Sender does not exist") };
    };
  };

  public type MessagePreview = {
    id : Text;
    senderId : UserId;
    senderName : Text;
    content : Text;
    timestamp : Time.Time;
  };

  public query ({ caller }) func getMessages(sessionId : SessionId, conversationId : Text, page : Nat, pageSize : Nat) : async [MessagePreview] {
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

        let reversed = conversation.messages.values().toArray().reverse();
        let end = if (start + pageSize > totalMessages) {
          totalMessages;
        } else {
          start + pageSize;
        };
        reversed.sliceToArray(start, end);
      };
      case (null) { Runtime.trap("Conversation does not exist") };
    };
  };

  public query ({ caller }) func getConversations(sessionId : SessionId) : async [ConversationView] {
    ignore switch (sessions.get(sessionId)) {
      case (?_) { () };
      case (null) { Runtime.trap("Invalid session") };
    };

    conversations.values().toArray().map(
      func(conversation) {
        {
          id = conversation.id;
          participantIds = conversation.participantIds;
          messages = conversation.messages.toArray();
        };
      }
    );
  };

  public shared ({ caller }) func seedSampleData() : async () {
    let alice : User = {
      id = "0";
      username = "Alice";
      email = "alice@test.com";
      avatarColor = ?"ff0000";
    };
    let bob : User = {
      id = "1";
      username = "Bob";
      email = "bob@test.com";
      avatarColor = ?"00ff00";
    };
    let charlie : User = {
      id = "2";
      username = "Charlie";
      email = "charlie@test.com";
      avatarColor = ?"0000ff";
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
    };
    let message2 : Message = {
      id = "1";
      senderId = bob.id;
      senderName = "Bob";
      content = "Hey Alice!";
      timestamp = Time.now();
    };

    let conversation : Conversation = {
      id = "0";
      participantIds = ["0", "1"];
      messages = List.fromArray([message1, message2]);
    };

    conversations.add("0", conversation);
  };
};
