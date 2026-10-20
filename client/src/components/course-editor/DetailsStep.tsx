import { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { CourseMetadataFormValues } from "@/lib/form-schemas";
import { SegmentedControl } from "./SegmentedControl";
import { NumberStepper } from "./NumberStepper";

type DetailsStepProps = {
  form: UseFormReturn<CourseMetadataFormValues>;
  disabled: boolean;
  categories: string[];
  difficulties: string[];
  instructors: { id: number; name: string }[];
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function DetailsStep({ form, disabled, categories, difficulties, instructors }: DetailsStepProps) {
  return (
    <div className="ced-grid">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem className="ced-span">
            <FormLabel className="k">Title</FormLabel>
            <FormControl>
              <Input className="ced-input" placeholder="e.g. Advanced Web Development with React" disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="ced-span">
            <FormLabel className="k">Description</FormLabel>
            <FormControl>
              <Textarea className="ced-input ced-area" placeholder="Provide a detailed description of the course" disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="k">Category</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} disabled={disabled}>
              <FormControl>
                <SelectTrigger className="ced-input">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="ced-pop">
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="difficulty"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="k">Difficulty</FormLabel>
            <FormControl>
              <SegmentedControl value={field.value} options={difficulties} disabled={disabled} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="duration"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="k">Duration</FormLabel>
            <FormControl>
              <NumberStepper
                value={Number(field.value) || 1}
                disabled={disabled}
                onChange={(next) => field.onChange(next)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="instructorId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="k">Instructor</FormLabel>
            <Select
              value={field.value ? String(field.value) : ""}
              onValueChange={(value) => field.onChange(value ? parseInt(value, 10) : null)}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger className="ced-input">
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="ced-pop">
                {instructors.map((instructor) => (
                  <SelectItem key={instructor.id} value={String(instructor.id)}>
                    <span className="ced-instructor">
                      <span className="ced-ava">{initials(instructor.name)}</span>
                      {instructor.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="isEnrollmentRequired"
        render={({ field }) => (
          <FormItem className="ced-span ced-enroll">
            <div>
              <FormLabel className="k">Enrollment required</FormLabel>
              <p>Turn off for free access without enrollment</p>
            </div>
            <FormControl>
              <Switch className="ced-switch" checked={field.value} onCheckedChange={field.onChange} disabled={disabled} aria-label="Enrollment required" />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
