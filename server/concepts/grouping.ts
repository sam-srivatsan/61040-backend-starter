import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface GroupOptions {
    privacy?: "public" | "private";
    colorTheme?: string;
    roles?: string[];
  }

export interface GroupDoc extends BaseDoc {
    creator: ObjectId; // User who created the group
    title: string; // Name of group, i.e. "Smith Family"
    members: ObjectId[]; // Array of usernames of users in group
    description?: string;
    options?: GroupOptions;
  }


/**
 * concept: Grouping [Group]
 */
export default class GroupingConcept {
    public readonly groups: DocCollection<GroupDoc>;

    constructor(collectionName: string) {
      this.groups = new DocCollection<GroupDoc>(collectionName);
    }

    async create(creator: ObjectId, title: string, members: ObjectId[], description?: string, options?: GroupOptions) {
      const groupId = await this.groups.createOne({ creator, title, members: [creator], description, options });
      return { msg: "Group successfully created!", groupId };
    }


  /**
   * Invites a user to join the group if the inviter is the admin.
   */
  async inviteUser(groupId: ObjectId, invitee: ObjectId) {
    const group = await this.groups.readOne({ _id: groupId });
    if (!group) throw new NotFoundError("Group not found!");

    if (group.members.includes(invitee)) {
      return { msg: "User is already a member!" };
    }

    // Add invitee to the group members
    group.members.push(invitee);

    await this.groups.partialUpdateOne({ _id: groupId }, { members: group.members });
    return { msg: "User successfully invited!" };
  }

  /**
   * Lists all members of the group.
   */
  async getMembers(groupId: ObjectId) {
    const group = await this.groups.readOne({ _id: groupId });
    if (!group) throw new NotFoundError("Group not found!");

    return group.members;
  }

  async assertIsInGroup(userId: ObjectId, groupId: ObjectId) {
    const group = await this.groups.readOne({ groupId });
    if (!group) {
      throw new NotFoundError(`Group ${groupId} does not exist!`);
    }
    if (!group.members.includes(userId) ) {
      throw new NotAllowedError(`User ${userId}, not allowed to invite to ${groupId}`);
    }
  }

  /**
   * Allows a user to leave the group voluntarily.
   */
  async leaveGroup(groupId: ObjectId, user: ObjectId) {
    const group = await this.groups.readOne({ _id: groupId });
    if (!group) throw new NotFoundError("Group not found!");

    if (!group.members.includes(user)) {
      throw new NotFoundError("You are not a member of this group!");
    }

    // Remove the user from members
    group.members = group.members.filter(member => member.toString() !== user.toString());

    await this.groups.partialUpdateOne({ _id: groupId }, { members: group.members });
    return { msg: "You have successfully left the group!" };
  }
  }
