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
  creator: ObjectId; // User who created the event
  title: string;
  date: Date;
  description?: string;
  attendees?: ObjectId[]; // List of users attending the event
  options?: EventOptions;
  groupId: ObjectId
}

/**
 * Concept: Eventing [Event]
 */
export default class EventingConcept {
  public readonly events: DocCollection<EventDoc>;

  constructor(collectionName: string) {
    this.events = new DocCollection<EventDoc>(collectionName);
  }

  // Create a new event
  async create(creator: ObjectId, groupId: ObjectId, title: string, date: Date, description?: string, attendees?: ObjectId[]) {
    const eventId = await this.events.createOne({
        creator,
        groupId,
        title,
        date,
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

  async getEventsByGroupId(groupId: ObjectId) {
    return await this.events.readMany({ groupId }, { sort: { date: 1 } });
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


  // Add an attendee to the event
  async addAttendee(eventId: ObjectId, attendeeId: ObjectId) {
    // Step 1: Read the existing event document
    const event = await this.events.readOne({ _id: eventId });
    if (!event) {
      throw new NotFoundError(`Event ${eventId} does not exist!`);
    }

    // Step 2: Check if the attendee is already in the list
    if (event.attendees?.includes(attendeeId)) {
      return { msg: "Attendee is already added!" };
    }

    // Step 3: Append the new attendee to the existing list
    const updatedAttendees = [...(event.attendees || []), attendeeId];

    // Step 4: Use partialUpdateOne with $set to update the entire attendees array
    await this.events.partialUpdateOne(
      { _id: eventId },
      { attendees: updatedAttendees }, // Update the entire array
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
