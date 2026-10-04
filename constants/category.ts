export const CATEGORIES = {
  // ================= EXPENSES =================
  food_dining: {
    label: "Food & Dining",
    type: "EXPENSE",
    icon: "restaurant-outline",
    color: "#F97316", // Orange
  },
  groceries: {
    label: "Groceries",
    type: "EXPENSE",
    icon: "cart-outline",
    color: "#10B981", // Emerald
  },
  transportation: {
    label: "Transportation",
    type: "EXPENSE",
    icon: "car-outline",
    color: "#06B6D4", // Cyan
  },
  housing: {
    label: "Housing & Rent",
    type: "EXPENSE",
    icon: "home-outline",
    color: "#6366F1", // Indigo
  },
  utilities: {
    label: "Bills & Utilities",
    type: "EXPENSE",
    icon: "flash-outline",
    color: "#EAB308", // Yellow
  },
  entertainment: {
    label: "Entertainment",
    type: "EXPENSE",
    icon: "film-outline",
    color: "#EC4899", // Pink
  },
  shopping: {
    label: "Shopping",
    type: "EXPENSE",
    icon: "bag-handle-outline",
    color: "#8B5CF6", // Purple
  },
  health_fitness: {
    label: "Health & Fitness",
    type: "EXPENSE",
    icon: "heart-outline",
    color: "#EF4444", // Red
  },
  education: {
    label: "Education",
    type: "EXPENSE",
    icon: "school-outline",
    color: "#3B82F6", // Blue
  },
  personal_care: {
    label: "Personal Care",
    type: "EXPENSE",
    icon: "sparkles-outline",
    color: "#F43F5E", // Rose
  },
  travel: {
    label: "Travel",
    type: "EXPENSE",
    icon: "airplane-outline",
    color: "#14B8A6", // Teal
  },
  other_expense: {
    label: "Other Expenses",
    type: "EXPENSE",
    icon: "ellipsis-horizontal-circle-outline",
    color: "#71717A", // Zinc
  },

  // ================= INCOME =================
  salary: {
    label: "Salary & Wages",
    type: "INCOME",
    icon: "briefcase-outline",
    color: "#22C55E", // Green
  },
  freelance: {
    label: "Freelance / Side Gig",
    type: "INCOME",
    icon: "laptop-outline",
    color: "#3B82F6", // Blue
  },
  investments: {
    label: "Investments & Dividends",
    type: "INCOME",
    icon: "trending-up-outline",
    color: "#8B5CF6", // Purple
  },
  allowance_gifts: {
    label: "Allowance & Gifts",
    type: "INCOME",
    icon: "gift-outline",
    color: "#EC4899", // Pink
  },
  other_income: {
    label: "Other Income",
    type: "INCOME",
    icon: "wallet-outline",
    color: "#14B8A6", // Teal
  },
} as const;

// -- DERIVED HELPERS

export type CategoryKey = keyof typeof CATEGORIES;

export const EXPENSE_CATEGORIES = Object.entries(CATEGORIES)
  .filter(([_, v]) => v.type === "EXPENSE")
  .map(([k, v]) => ({ key: k as CategoryKey, ...v }));

export const INCOME_CATEGORIES = Object.entries(CATEGORIES)
  .filter(([_, v]) => v.type === "INCOME")
  .map(([k, v]) => ({ key: k as CategoryKey, ...v }));

// Single lookup by key - use this everywhere instead of CATEGORIES[key]
export const getCategoryConfig = (key: CategoryKey) => CATEGORIES[key];

// Used in Gemini / AI prompt parsers - gives the model the full list of valid keys
export const CATEGORY_KEYS_EXPENSE = EXPENSE_CATEGORIES.map((c) => c.key);
export const CATEGORY_KEYS_INCOME = INCOME_CATEGORIES.map((c) => c.key);