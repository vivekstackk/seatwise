export type Event = {
  id: string;
  number: string;
  title: string;
  category: string;
  date: string;
  location: string;
  venue: string;
  image: string;
  time: string;
  description: string;
  price: number;
};

export const events: Event[] = [
  {
    id: "after-dark",
    number: "01",
    title: "After Dark",
    category: "Music",
    date: "14 AUG",
    location: "Mumbai",
    venue: "NESCO Center",
    image: "/events/img-1.png",
    time: "08:00 PM",
    description:
      "An immersive late-night music experience built around sound, light and movement.",
    price: 1499,
  },

  {
    id: "the-last-light",
    number: "02",
    title: "The Last Light",
    category: "Theatre",
    date: "22 AUG",
    location: "Delhi",
    venue: "Kamani Auditorium",
    image: "/events/img-2.png",
    time: "07:30 PM",
    description:
      "A contemporary theatre performance exploring memory, distance and the final moments of light.",
    price: 899,
  },

  {
    id: "frequency",
    number: "03",
    title: "Frequency",
    category: "Music",
    date: "30 AUG",
    location: "Bengaluru",
    venue: "Palace Grounds",
    image: "/events/img-3.png",
    time: "07:00 PM",
    description:
      "A large-scale live music experience bringing rhythm, atmosphere and thousands of people together.",
    price: 1799,
  },

  {
    id: "stand-alone",
    number: "04",
    title: "Stand Alone",
    category: "Comedy",
    date: "05 SEP",
    location: "Pune",
    venue: "The Box",
    image: "/events/img-4.png",
    time: "08:30 PM",
    description:
      "An intimate evening of sharp observations, stories and live stand-up comedy.",
    price: 699,
  },

  {
    id: "between-rooms",
    number: "05",
    title: "Between Rooms",
    category: "Culture",
    date: "12 SEP",
    location: "Mumbai",
    venue: "NMACC",
    image: "/events/img-5.png",
    time: "06:30 PM",
    description:
      "A spatial cultural experience moving between installation, performance and contemporary art.",
    price: 999,
  },

  {
    id: "open-field",
    number: "06",
    title: "Open Field",
    category: "Music",
    date: "19 SEP",
    location: "Goa",
    venue: "Vagator",
    image: "/events/img-6.png",
    time: "05:00 PM",
    description:
      "An open-air music gathering shaped by sunset, landscape and uninterrupted sound.",
    price: 1999,
  },

  {
    id: "movement",
    number: "07",
    title: "Movement",
    category: "Theatre",
    date: "26 SEP",
    location: "Delhi",
    venue: "Studio Safdar",
    image: "/events/img-7.png",
    time: "07:30 PM",
    description:
      "An experimental performance where physical movement becomes the primary language.",
    price: 799,
  },

  {
    id: "ninety-minutes",
    number: "08",
    title: "Ninety Minutes",
    category: "Sports",
    date: "03 OCT",
    location: "Kolkata",
    venue: "Salt Lake Stadium",
    image: "/events/img-8.png",
    time: "07:00 PM",
    description:
      "Ninety minutes of live stadium energy, competition and collective anticipation.",
    price: 1299,
  },

  {
    id: "the-room",
    number: "09",
    title: "The Room",
    category: "Culture",
    date: "11 OCT",
    location: "Jaipur",
    venue: "Jawahar Kala Kendra",
    image: "/events/img-9.png",
    time: "06:00 PM",
    description:
      "An intimate cultural installation exploring people, architecture and shared space.",
    price: 599,
  },
];