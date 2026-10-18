import type Ionicons from "@expo/vector-icons/Ionicons";

export type IoniconsGlyph = keyof typeof Ionicons.glyphMap;

export interface CategoryIconItem {
  name: IoniconsGlyph;
  label: string;
  category: string;
  keywords: string[];
}

export const CATEGORY_ICON_SECTIONS: { category: string; icons: CategoryIconItem[] }[] = [
  {
    category: "Food & Dining",
    icons: [
      { name: "restaurant", label: "Restaurant", category: "Food & Dining", keywords: ["food", "dining", "dinner", "lunch", "eat", "meal"] },
      { name: "fast-food", label: "Fast Food", category: "Food & Dining", keywords: ["burger", "fries", "takeout", "junk"] },
      { name: "cafe", label: "Cafe & Coffee", category: "Food & Dining", keywords: ["coffee", "tea", "cafe", "latte", "breakfast"] },
      { name: "pizza", label: "Pizza", category: "Food & Dining", keywords: ["pizza", "italian", "snack", "slice"] },
      { name: "beer", label: "Drinks & Bar", category: "Food & Dining", keywords: ["beer", "alcohol", "bar", "pub", "drinks"] },
      { name: "wine", label: "Wine & Spirits", category: "Food & Dining", keywords: ["wine", "cocktails", "nightlife", "drinks"] },
      { name: "nutrition", label: "Healthy & Greens", category: "Food & Dining", keywords: ["salad", "vegan", "vegetables", "organic", "diet"] },
      { name: "ice-cream", label: "Bakery & Desserts", category: "Food & Dining", keywords: ["sweets", "bakery", "cake", "ice cream", "dessert"] },
    ],
  },
  {
    category: "Shopping & Groceries",
    icons: [
      { name: "cart", label: "Supermarket", category: "Shopping & Groceries", keywords: ["cart", "groceries", "supermarket", "store"] },
      { name: "basket", label: "Market Basket", category: "Shopping & Groceries", keywords: ["groceries", "market", "bazaar", "produce"] },
      { name: "bag-handle", label: "Retail Shopping", category: "Shopping & Groceries", keywords: ["shopping", "mall", "clothes", "store", "buy"] },
      { name: "shirt", label: "Apparel & Clothes", category: "Shopping & Groceries", keywords: ["fashion", "clothing", "wear", "shoes", "outfit"] },
      { name: "gift", label: "Gifts & Celebrations", category: "Shopping & Groceries", keywords: ["present", "holiday", "birthday", "party"] },
      { name: "pricetag", label: "Discounts & Sales", category: "Shopping & Groceries", keywords: ["tag", "deal", "discount", "offer"] },
      { name: "storefront", label: "Local Shop", category: "Shopping & Groceries", keywords: ["boutique", "vendor", "stall", "kiosk"] },
    ],
  },
  {
    category: "Transport & Travel",
    icons: [
      { name: "car", label: "Car & Auto", category: "Transport & Travel", keywords: ["vehicle", "driving", "toll", "parking", "auto"] },
      { name: "speedometer", label: "Fuel & Gas", category: "Transport & Travel", keywords: ["petrol", "diesel", "cng", "station", "mileage"] },
      { name: "car-sport", label: "Taxi & Rideshare", category: "Transport & Travel", keywords: ["uber", "careem", "cab", "ride", "taxi"] },
      { name: "bus", label: "Public Bus", category: "Transport & Travel", keywords: ["transit", "commute", "metro bus", "coach"] },
      { name: "train", label: "Train & Metro", category: "Transport & Travel", keywords: ["railway", "subway", "tram", "commute"] },
      { name: "airplane", label: "Flights & Travel", category: "Transport & Travel", keywords: ["flight", "vacation", "trip", "tourism", "airline"] },
      { name: "bicycle", label: "Bike & Cycling", category: "Transport & Travel", keywords: ["cycling", "pedal", "cycle", "ride"] },
      { name: "boat", label: "Boat & Marine", category: "Transport & Travel", keywords: ["ferry", "cruise", "shipping", "harbor"] },
    ],
  },
  {
    category: "Housing & Bills",
    icons: [
      { name: "home", label: "Rent & Mortgage", category: "Housing & Bills", keywords: ["housing", "apartment", "lease", "residence", "property"] },
      { name: "flash", label: "Electricity", category: "Housing & Bills", keywords: ["power", "utility", "electric", "bill", "energy"] },
      { name: "water", label: "Water & Sewage", category: "Housing & Bills", keywords: ["utility", "tap", "drainage", "bill"] },
      { name: "flame", label: "Gas & Heating", category: "Housing & Bills", keywords: ["gas", "cylinder", "sui", "heating", "fuel"] },
      { name: "wifi", label: "Internet & Wi-Fi", category: "Housing & Bills", keywords: ["broadband", "fiber", "network", "data", "dsl"] },
      { name: "construct", label: "Repairs & Maintenance", category: "Housing & Bills", keywords: ["tools", "plumber", "electrician", "hardware", "fix"] },
      { name: "trash", label: "Sanitation & Trash", category: "Housing & Bills", keywords: ["garbage", "cleaning", "waste", "community"] },
      { name: "bed", label: "Hotel & Lodging", category: "Housing & Bills", keywords: ["stay", "hostel", "accommodation", "resort"] },
    ],
  },
  {
    category: "Finance & Wealth",
    icons: [
      { name: "wallet", label: "Wallet & Cash", category: "Finance & Wealth", keywords: ["pocket", "money", "physical cash"] },
      { name: "cash", label: "Income & Salary", category: "Finance & Wealth", keywords: ["payday", "wage", "stipend", "revenue"] },
      { name: "card", label: "Cards & Banking", category: "Finance & Wealth", keywords: ["debit", "credit", "bank", "account", "atm"] },
      { name: "trending-up", label: "Investments", category: "Finance & Wealth", keywords: ["stocks", "crypto", "mutual funds", "growth"] },
      { name: "shield-checkmark", label: "Insurance", category: "Finance & Wealth", keywords: ["policy", "protection", "health cover", "takaful"] },
      { name: "diamond", label: "Gold & Luxury", category: "Finance & Wealth", keywords: ["metals", "jewelry", "wealth", "asset"] },
      { name: "swap-horizontal", label: "Transfers", category: "Finance & Wealth", keywords: ["send", "remittance", "wire", "exchange"] },
      { name: "briefcase", label: "Business & Work", category: "Finance & Wealth", keywords: ["office", "freelance", "contract", "client"] },
    ],
  },
  {
    category: "Health & Care",
    icons: [
      { name: "medkit", label: "Hospital & Doctor", category: "Health & Care", keywords: ["clinic", "consultation", "physician", "checkup"] },
      { name: "bandage", label: "Pharmacy & Meds", category: "Health & Care", keywords: ["medicine", "prescription", "drugs", "pills"] },
      { name: "pulse", label: "Diagnostics & Labs", category: "Health & Care", keywords: ["tests", "heart", "blood", "medical", "scan"] },
      { name: "fitness", label: "Gym & Sports", category: "Health & Care", keywords: ["workout", "exercise", "trainer", "club", "crossfit"] },
      { name: "heart", label: "Life & Wellness", category: "Health & Care", keywords: ["care", "therapy", "mental health", "wellness"] },
      { name: "sparkles", label: "Beauty & Grooming", category: "Health & Care", keywords: ["salon", "barber", "haircut", "skincare", "cosmetics"] },
    ],
  },
  {
    category: "Entertainment & Tech",
    icons: [
      { name: "film", label: "Cinema & Movies", category: "Entertainment & Tech", keywords: ["cinema", "theatre", "netflix", "shows"] },
      { name: "game-controller", label: "Gaming", category: "Entertainment & Tech", keywords: ["steam", "playstation", "xbox", "pc", "games"] },
      { name: "musical-notes", label: "Music & Audio", category: "Entertainment & Tech", keywords: ["spotify", "concert", "albums", "tunes"] },
      { name: "tv", label: "Streaming & TV", category: "Entertainment & Tech", keywords: ["cable", "television", "hulu", "prime"] },
      { name: "ticket", label: "Events & Outings", category: "Entertainment & Tech", keywords: ["pass", "expo", "festival", "amusement"] },
      { name: "camera", label: "Photography", category: "Entertainment & Tech", keywords: ["photos", "studio", "gear", "video"] },
      { name: "phone-portrait", label: "Mobile Recharge", category: "Entertainment & Tech", keywords: ["sim", "topup", "cellular", "telecom"] },
      { name: "laptop", label: "Electronics & PC", category: "Entertainment & Tech", keywords: ["computer", "gadget", "software", "tech"] },
      { name: "calendar", label: "Subscriptions", category: "Entertainment & Tech", keywords: ["recurring", "membership", "monthly", "saas"] },
    ],
  },
  {
    category: "Education & Family",
    icons: [
      { name: "school", label: "School & University", category: "Education & Family", keywords: ["tuition", "college", "fees", "degree"] },
      { name: "book", label: "Books & Courses", category: "Education & Family", keywords: ["reading", "study", "exam", "learning", "stationery"] },
      { name: "people", label: "Family & Social", category: "Education & Family", keywords: ["kids", "children", "parents", "relatives"] },
      { name: "paw", label: "Pets & Animals", category: "Education & Family", keywords: ["cat", "dog", "vet", "pet food", "animals"] },
      { name: "football", label: "Sports & Hobbies", category: "Education & Family", keywords: ["soccer", "cricket", "match", "gear"] },
      { name: "leaf", label: "Garden & Plants", category: "Education & Family", keywords: ["flowers", "nursery", "environment", "nature"] },
      { name: "mail", label: "Postal & Courier", category: "Education & Family", keywords: ["shipping", "package", "delivery", "post"] },
      { name: "help-circle", label: "General & Misc", category: "Education & Family", keywords: ["other", "miscellaneous", "unknown"] },
    ],
  },
];

export const ALL_CATEGORY_ICONS: CategoryIconItem[] = CATEGORY_ICON_SECTIONS.flatMap(
  (sec) => sec.icons,
);

export function searchCategoryIcons(query: string): CategoryIconItem[] {
  const sanitized = query.trim().toLowerCase();
  if (!sanitized) return ALL_CATEGORY_ICONS;

  return ALL_CATEGORY_ICONS.filter(
    (item) =>
      item.label.toLowerCase().includes(sanitized) ||
      item.name.toLowerCase().includes(sanitized) ||
      item.category.toLowerCase().includes(sanitized) ||
      item.keywords.some((k) => k.toLowerCase().includes(sanitized)),
  );
}

