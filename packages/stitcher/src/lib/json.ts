import { DateTime } from "luxon";
import { assert } from "shared/assert";
import { parse, registerCustom, stringify } from "superjson";

registerCustom<DateTime, string>(
  {
    isApplicable: (value) => DateTime.isDateTime(value),
    serialize: (dateTime) => {
      const value = dateTime.toISO();
      assert(value, "No convert to ISO");
      return value;
    },
    deserialize: (value) => DateTime.fromISO(value),
  },
  "DateTime",
);

export const JSON = {
  parse,
  stringify,
};
