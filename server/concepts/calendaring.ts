import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

// CalendarDoc represents a calendar for each user
export interface CalendarDoc extends BaseDoc {
  userId: ObjectId; // Reference to the user who owns the calendar
  items: string[];  // Array of item strings (could be item titles or IDs)
}

// Define an interface for a group member
interface GroupMember {
  _id: ObjectId; // The ObjectId of the group member
}

/**
 * Concept: Calendaring
 */
export default class CalendaringConcept {
  public readonly calendars: DocCollection<CalendarDoc>;

  constructor(collectionName: string) {
    this.calendars = new DocCollection<CalendarDoc>(collectionName);
  }

  // Initialize a new calendar for a user
  async createCalendar(userId: ObjectId) {
    const existingCalendar = await this.calendars.readOne({ userId });
    if (existingCalendar) {
      return { msg: "User already has a calendar!", calendar: existingCalendar };
    }

    const calendarId = await this.calendars.createOne({ userId, items: [] });
    return { msg: "Calendar created successfully!", calendar: await this.calendars.readOne({ _id: calendarId }) };
  }

  // Add an item to the user's calendar
  async addItem(userId: ObjectId, item: string) {
    const calendar = await this.calendars.readOne({ userId });
    if (!calendar) {
      throw new NotFoundError(`Calendar for user ${userId} does not exist!`);
    }

    // Check if the item is already in the calendar
    if (calendar.items.includes(item)) {
      return { msg: "Item is already in the calendar!" };
    }

    // Create the updated items array
    const updatedItems = [...calendar.items, item];

    // Use partialUpdateOne with $set to update the entire items array
    await this.calendars.partialUpdateOne(
      { userId },
      { items: updatedItems } // Update the entire array
    );

    return { msg: "Item added to calendar!", calendar: await this.calendars.readOne({ userId }) };
  }

  // Remove an item from the user's calendar
  async removeItem(userId: ObjectId, item: string) {
    const calendar = await this.calendars.readOne({ userId });
    if (!calendar) {
      throw new NotFoundError(`Calendar for user ${userId} does not exist!`);
    }

    // Check if the item is in the calendar
    if (!calendar.items.includes(item)) {
      return { msg: "Item not found in the calendar!" };
    }

    // Create the updated items array without the item
    const updatedItems = calendar.items.filter(i => i !== item);

    // Use partialUpdateOne with $set to update the entire items array
    await this.calendars.partialUpdateOne(
      { userId },
      { items: updatedItems } // Update the entire array
    );

    return { msg: "Item removed from calendar!", calendar: await this.calendars.readOne({ userId }) };
  }

  // Get all items in the user's calendar
  async getCalendar(userId: ObjectId) {
    const calendar = await this.calendars.readOne({ userId });
    if (!calendar) {
      throw new NotFoundError(`Calendar for user ${userId} does not exist!`);
    }

    return { msg: "User's calendar fetched!", calendar };
  }

  // TODO: CREATE A CALENDAR FOR A USER 

  // Retrieve items for a list of user IDs (group members)
  async getItemsByGroupMembers(memberIds: ObjectId[]): Promise<string[]> {
    const items: string[] = [];

    for (const memberId of memberIds) {
      const calendar = await this.calendars.readOne({ userId: memberId });
      if (calendar) {
        items.push(...calendar.items); // Collect items from each member's calendar
      }
    }

    return items;
  }
}
