import { ObjectId } from "mongodb";
import { Router, getExpressRouter } from "./framework/router";
import { Authing, Friending, Posting, Sessioning, Grouping, Calendaring, Eventing } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import { GroupOptions } from "./concepts/grouping";
import Responses from "./responses";
import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.post("/group")
  async createGroup(session: SessionDoc, creator: ObjectId, title: string, members: ObjectId[], description?: string, options?: GroupOptions) {
    const user = Sessioning.getUser(session);
    const created = await Grouping.create(user, title, members, description, options);
    return { msg: created.msg, groupId: created.groupId };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }

  // Add another user to a group that you are already in
  @Router.put("/group/:userId")
  async addToGroup(session: SessionDoc, inviteeId: string, groupId: string) {
    const user = Sessioning.getUser(session);
    const groupOid = new ObjectId(groupId);
    const inviteeOid = new ObjectId(inviteeId);
    await Grouping.assertIsInGroup(user, groupOid);
    return await Grouping.inviteUser(groupOid, inviteeOid);
  }

// If a user is logged in, add an event to the calendar
@Router.put("/calendar")
async addEventToCalendar(session: SessionDoc, eventId: string) {
  const user = Sessioning.getUser(session);
  await Calendaring.addItem(user, eventId); // Adding the event to the user's calendar
  return { msg: "Event added to calendar!" };
}




  // You can delete your own calendar event
  @Router.delete("/calendar/:eventId")
  async deleteEventFromCalendar(session: SessionDoc, userId: string, eventId: string) {
    const user = Sessioning.getUser(session);
    const eventOid = new ObjectId(eventId)
    const userOid = new ObjectId(userId)
    await Eventing.assertCreatorIsUser(eventOid, user);
    return await Calendaring.removeItem(userOid,eventId);
  }

  // Get calendar events by group members
  @Router.get("/calendar/group/:members")
  async getEventsByGroupId(session: SessionDoc, members: string[])
   {
    const membersOid: ObjectId[] = members.map(id => new ObjectId(id));
    const user = Sessioning.getUser(session);
    const events = await Calendaring.getItemsByGroupMembers(membersOid);
    return { msg: "Fetched calendar events for group!", events };
  }


  // Get calendar events by groupId
  @Router.get("/calendar/group/:groupId")
  async getCalendarEventsByGroupId(session: SessionDoc, groupId: string) {
    const user = Sessioning.getUser(session);
    const groupoid = new ObjectId(groupId)
    const members = await Grouping.getMembers(groupoid);
    const events = await Calendaring.getItemsByGroupMembers(members);
    return { msg: "Fetched calendar events for group members!", events };
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
