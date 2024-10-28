// import { ObjectId } from "mongodb";
// import DocCollection, { BaseDoc } from "../framework/doc";
// import { NotAllowedError, NotFoundError } from "./errors";

// // Event options, such as location, reminder, and color theme
// export interface EventOptions {
//   location?: string;
//   reminder?: boolean;
//   colorTheme?: string;
// }

// // Event document interface, extending the BaseDoc interface
// export interface EventDoc extends BaseDoc {
//   creator: ObjectId; // User who created the event
//   title: string;
//   date: Date;
//   description?: string;
//   attendees?: ObjectId[]; // List of users attending the event
//   options?: EventOptions;
//   groupId: ObjectId
// }

// /**
//  * Concept: Eventing [Event]
//  */
// export default class EventingConcept {
//   public readonly events: DocCollection<EventDoc>;

//   constructor(collectionName: string) {
//     this.events = new DocCollection<EventDoc>(collectionName);
//   }

//   // Create a new event
//   async create(creator: ObjectId, groupId: ObjectId, title: string, date: Date, description?: string, attendees?: ObjectId[]) {
//     const eventId = await this.events.createOne({
//         creator,
//         groupId,
//         title,
//         date,
//         description,
//         attendees,
//     });
//     return {
//         msg: "Event successfully created!",
//         event: await this.events.readOne({ _id: eventId }),
//     };
// }


//   // Assert that the creator of the event is the current user
//   async assertCreatorIsUser(eventId: ObjectId, user: ObjectId) {
//     const event = await this.events.readOne({ _id: eventId });
//     if (!event) {
//       throw new NotFoundError(`Event ${eventId} does not exist!`);
//     }
//     if (event.creator.toString() !== user.toString()) {
//       throw new EventCreatorNotMatchError(user, eventId);
//     }
//   }

//   // Get all events, sorted by date
//   async getEvents() {
//     return await this.events.readMany({}, { sort: { date: 1 } });
//   }

//   // Get events by user (based on attendance)
//   async getByUser(user: ObjectId) {
//     return await this.events.readMany({ attendees: user });
//   }

//   async getEventsByGroupId(groupId: ObjectId) {
//     return await this.events.readMany({ groupId }, { sort: { date: 1 } });
// }


//   // Delete an event
//   async delete(eventId: ObjectId) {
//     await this.events.deleteOne({ _id: eventId });
//     return { msg: "Event deleted successfully!" };
//   }

// // Delete events created by a specific user in a specific group
// async deleteEventsByCreatorAndGroup(creator: ObjectId, groupId: ObjectId) {
//   const deletedCount = await this.events.deleteMany({
//     creator,
//     groupId,
//   });

//   return {
//     msg: `${deletedCount} events created by user in group have been deleted.`,
//   };
// }


//   // Add an attendee to the event
//   async addAttendee(eventId: ObjectId, attendeeId: ObjectId) {
//     // Step 1: Read the existing event document
//     const event = await this.events.readOne({ _id: eventId });
//     if (!event) {
//       throw new NotFoundError(`Event ${eventId} does not exist!`);
//     }

//     // Step 2: Check if the attendee is already in the list
//     if (event.attendees?.includes(attendeeId)) {
//       return { msg: "Attendee is already added!" };
//     }

//     // Step 3: Append the new attendee to the existing list
//     const updatedAttendees = [...(event.attendees || []), attendeeId];

//     // Step 4: Use partialUpdateOne with $set to update the entire attendees array
//     await this.events.partialUpdateOne(
//       { _id: eventId },
//       { attendees: updatedAttendees }, // Update the entire array
//     );

//     return {
//       msg: "Attendee added successfully!",
//       event: await this.events.readOne({ _id: eventId }),
//     };
//   }
// }

// // Error for when the user trying to modify the event is not the creator
// export class EventCreatorNotMatchError extends NotAllowedError {
//   constructor(
//     public readonly creator: ObjectId,
//     public readonly eventId: ObjectId,
//   ) {
//     super("{0} is not the creator of event {1}!", creator, eventId);
//   }
// }

import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

// Event options, such as location, reminder, and color theme
export interface EventOptions {
  location?: string;
  reminder?: boolean;
  colorTheme?: string;
}

// Event document interface, extending the BaseDoc interface
export interface EventDoc extends BaseDoc {
  creator: ObjectId;           // User who created the event
  title: string;
  date: Date;                  // Date of the event stored as a Date object in MongoDB
  description?: string;
  attendees?: ObjectId[];      // List of users attending the event
  options?: EventOptions;
  groupId: ObjectId;
}

/**
 * Concept: Eventing [Event]
 */
export default class EventingConcept {
  public readonly events: DocCollection<EventDoc>;

  constructor(collectionName: string) {
    this.events = new DocCollection<EventDoc>(collectionName);
  }

  // Utility function to parse date-time strings and validate them
  private parseDate(dateString: string): Date {
    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date format: ${dateString}. Please use ISO format (e.g., 'YYYY-MM-DDTHH:MM:SSZ').`);
    }
    return parsedDate;
  }

  /**
   * Create a new event
   *
   * @param creator - ObjectId of the user creating the event
   * @param groupId - ObjectId of the group associated with the event
   * @param title - Title of the event
   * @param date - Date string in ISO format
   * @param description - Optional description of the event
   * @param attendees - Optional list of attendee ObjectIds
   *
   * Prompt the user:
   *   - "Enter the event title:"
   *   - "Enter the event date in ISO format (e.g., '2024-12-31T18:30:00Z' for December 31, 2024 at 6:30 PM UTC):"
   *   - "Optionally, add a description of the event:"
   *   - "Add attendees by selecting them from your contacts or entering their IDs."
   */
  async create(
    creator: ObjectId,
    groupId: ObjectId,
    title: string,
    date: string,
    description?: string,
    attendees?: ObjectId[]
  ) {
    const parsedDate = this.parseDate(date);  // Parse date string to Date object

    const eventId = await this.events.createOne({
      creator,
      groupId,
      title,
      date: parsedDate,    // Store as Date in MongoDB
      description,
      attendees,
    });

    return {
      msg: "Event successfully created!",
      event: await this.events.readOne({ _id: eventId }),
    };
  }

  // Assert that the creator of the event is the current user
  async assertCreatorIsUser(eventId: ObjectId, user: ObjectId) {
    const event = await this.events.readOne({ _id: eventId });
    if (!event) {
      throw new NotFoundError(`Event ${eventId} does not exist!`);
    }
    if (event.creator.toString() !== user.toString()) {
      throw new EventCreatorNotMatchError(user, eventId);
    }
  }

  // Get all events, sorted by date
  async getEvents() {
    return await this.events.readMany({}, { sort: { date: 1 } });
  }

  // Get events by user (based on attendance)
  async getByUser(user: ObjectId) {
    return await this.events.readMany({ attendees: user });
  }

  // Get events by group, sorted by date
  async getEventsByGroupId(groupId: ObjectId) {
    const events = await this.events.readMany({ groupId }, { sort: { date: 1 } });
    return events.map(event => ({
      ...event,
      date: event.date.toISOString(),  // Convert Date to ISO string for frontend
    }));
  }

  /**
   * Update an event, allowing updates to the title, date, description, or attendees
   *
   * @param eventId - ObjectId of the event to update
   * @param updates - Object containing fields to update
   *
   * Prompt the user:
   *   - "Update the event title (leave blank to keep the current title):"
   *   - "Update the event date in ISO format (leave blank to keep the current date):"
   *   - "Update the event description (leave blank to keep the current description):"
   *   - "Update attendees by selecting new contacts or entering their IDs."
   */
  async updateEvent(
    eventId: ObjectId,
    updates: Partial<{ title: string; date: string; description: string; attendees: ObjectId[] }>
  ) {
    const updateData: Partial<EventDoc> = {};

    // Assign compatible fields
    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.attendees) updateData.attendees = updates.attendees;

    // Parse and assign date if it's provided
    if (updates.date) {
      updateData.date = this.parseDate(updates.date);  // Convert string date to Date object
    }

    await this.events.partialUpdateOne({ _id: eventId }, updateData);  // Update only provided fields
    return {
      msg: "Event updated successfully!",
      event: await this.events.readOne({ _id: eventId }),
    };
  }


  // Delete an event
  async delete(eventId: ObjectId) {
    await this.events.deleteOne({ _id: eventId });
    return { msg: "Event deleted successfully!" };
  }

  // Delete events created by a specific user in a specific group
  async deleteEventsByCreatorAndGroup(creator: ObjectId, groupId: ObjectId) {
    const deletedCount = await this.events.deleteMany({
      creator,
      groupId,
    });

    return {
      msg: `${deletedCount} events created by user in group have been deleted.`,
    };
  }

  /**
   * Add an attendee to the event
   *
   * @param eventId - ObjectId of the event
   * @param attendeeId - ObjectId of the attendee to add
   *
   * Prompt the user:
   *   - "Enter the ID of the attendee to add to this event:"
   */
  async addAttendee(eventId: ObjectId, attendeeId: ObjectId) {
    const event = await this.events.readOne({ _id: eventId });
    if (!event) {
      throw new NotFoundError(`Event ${eventId} does not exist!`);
    }

    if (event.attendees?.some(attendee => attendee.equals(attendeeId))) {
      return { msg: "Attendee is already added!" };
    }

    const updatedAttendees = [...(event.attendees || []), attendeeId];
    await this.events.partialUpdateOne(
      { _id: eventId },
      { attendees: updatedAttendees },
    );

    return {
      msg: "Attendee added successfully!",
      event: await this.events.readOne({ _id: eventId }),
    };
  }
}

// Error for when the user trying to modify the event is not the creator
export class EventCreatorNotMatchError extends NotAllowedError {
  constructor(
    public readonly creator: ObjectId,
    public readonly eventId: ObjectId,
  ) {
    super("{0} is not the creator of event {1}!", creator, eventId);
  }
}
