const ET_OFFSET = -5;

function getETDate(date: Date = new Date()): { day: number; hours: number; minutes: number } {
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const utcDay = date.getUTCDay();

  let etHours = utcHours + ET_OFFSET;
  let etDay = utcDay;

  if (etHours < 0) {
    etHours += 24;
    etDay = (etDay + 6) % 7;
  } else if (etHours >= 24) {
    etHours -= 24;
    etDay = (etDay + 1) % 7;
  }

  return { day: etDay, hours: etHours, minutes: utcMinutes };
}

export interface MarketStatus {
  isOpen: boolean;
  label: string;
  nextChange: string;
}

export function getMarketStatus(): MarketStatus {
  const { day, hours, minutes } = getETDate();
  const timeInMinutes = hours * 60 + minutes;
  const marketOpen = 17 * 60;

  if (day === 0) {
    if (timeInMinutes >= marketOpen) {
      return { isOpen: true, label: "Open", nextChange: "Closes Friday 5:00 PM ET" };
    }
    const remaining = marketOpen - timeInMinutes;
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    return { isOpen: false, label: "Closed", nextChange: `Opens in ${h}h ${m}m` };
  }

  if (day === 5) {
    if (timeInMinutes < marketOpen) {
      return { isOpen: true, label: "Open", nextChange: "Closes today 5:00 PM ET" };
    }
    return { isOpen: false, label: "Closed (Weekend)", nextChange: "Opens Sunday 5:00 PM ET" };
  }

  if (day === 6) {
    return { isOpen: false, label: "Closed (Weekend)", nextChange: "Opens Sunday 5:00 PM ET" };
  }

  return { isOpen: true, label: "Open", nextChange: "Closes Friday 5:00 PM ET" };
}
