// Validation schemas for league and group forms

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// League validation
export function validateLeague(data: {
  name: string;
  start_date: string;
  end_date: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // Name validation
  if (!data.name || data.name.trim().length === 0) {
    errors.push({ field: "name", message: "League name is required" });
  } else if (data.name.length > 255) {
    errors.push({
      field: "name",
      message: "League name must be 255 characters or less",
    });
  }

  // Date validation
  if (!data.start_date) {
    errors.push({ field: "start_date", message: "Start date is required" });
  }

  if (!data.end_date) {
    errors.push({ field: "end_date", message: "End date is required" });
  }

  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (isNaN(startDate.getTime())) {
      errors.push({
        field: "start_date",
        message: "Invalid start date format",
      });
    }

    if (isNaN(endDate.getTime())) {
      errors.push({ field: "end_date", message: "Invalid end date format" });
    }

    if (
      !isNaN(startDate.getTime()) &&
      !isNaN(endDate.getTime()) &&
      startDate >= endDate
    ) {
      errors.push({
        field: "end_date",
        message: "End date must be after start date",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Group validation
export function validateGroup(data: {
  name: string;
  level: string;
  gender: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // Name validation
  if (!data.name || data.name.trim().length === 0) {
    errors.push({ field: "name", message: "Group name is required" });
  } else if (data.name.length > 255) {
    errors.push({
      field: "name",
      message: "Group name must be 255 characters or less",
    });
  }

  // Level validation
  const validLevels = ["2", "3", "4"];
  if (!data.level) {
    errors.push({ field: "level", message: "Level is required" });
  } else if (!validLevels.includes(data.level)) {
    errors.push({ field: "level", message: "Level must be 2, 3, or 4" });
  }

  // Gender validation
  const validGenders = ["male", "female", "mixed"];
  if (!data.gender) {
    errors.push({ field: "gender", message: "Gender is required" });
  } else if (!validGenders.includes(data.gender)) {
    errors.push({
      field: "gender",
      message: "Gender must be male, female, or mixed",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper function to get error message for a specific field
export function getFieldError(
  errors: ValidationError[],
  field: string
): string | undefined {
  return errors.find((error) => error.field === field)?.message;
}

// Helper function to check if a field has an error
export function hasFieldError(
  errors: ValidationError[],
  field: string
): boolean {
  return errors.some((error) => error.field === field);
}
