/** Plain, serializable shapes passed from the server component to the client. */

export type FoodOption = {
  id: number;
  name: string;
  unit: string;
  caloriesPerUnit: number;
  protein: number;
  carbs: number;
  fat: number;
  isCustom: boolean;
};

export type EntryView = {
  id: number;
  quantity: number;
  food: FoodOption;
};

export type DayTotal = {
  date: string;
  calories: number;
};
