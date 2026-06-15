import {
  AAC_VALUES,
  ADG_VALUES,
  FAA_WEIGHT_CLASSES,
  ICAO_WTC_VALUES,
} from "@/lib/fleet";
import {
  portalFieldClassName,
  portalFieldGroupClassName,
  portalLabelClassName,
  portalLinkClassName,
} from "@/components/portal-styles";

export type CustomAircraftFormValues = {
  manufacturer: string;
  model: string;
  tailNumber: string;
  seats: string;
  rnavEquipped: boolean;
  icaoWtc: string;
  weightClass: string;
  wingspanFt: string;
  lengthFt: string;
  aac: string;
  adg: string;
};

export const EMPTY_CUSTOM_AIRCRAFT_FORM: CustomAircraftFormValues = {
  manufacturer: "",
  model: "",
  tailNumber: "",
  seats: "",
  rnavEquipped: false,
  icaoWtc: "",
  weightClass: "",
  wingspanFt: "",
  lengthFt: "",
  aac: "",
  adg: "",
};

const ICAO_WTC_LABELS: Record<(typeof ICAO_WTC_VALUES)[number], string> = {
  L: "L — Light",
  M: "M — Medium",
  H: "H — Heavy",
  J: "J — Super",
};

const ADG_LABELS: Record<(typeof ADG_VALUES)[number], string> = {
  A: "A — (FAA class I)",
  B: "B — (FAA class II)",
  C: "C — (FAA class III)",
  D: "D — (FAA class IV)",
  E: "E — (FAA class V)",
  F: "F — (FAA class VI)",
};

type CustomAircraftFieldsProps = {
  values: CustomAircraftFormValues;
  onChange: (values: CustomAircraftFormValues) => void;
  onChooseFromList: () => void;
};

/**
 * Form fields for adding an aircraft that is not in the reference catalogue.
 */
export function CustomAircraftFields({
  values,
  onChange,
  onChooseFromList,
}: CustomAircraftFieldsProps) {
  function updateField<K extends keyof CustomAircraftFormValues>(
    field: K,
    value: CustomAircraftFormValues[K],
  ) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onChooseFromList}
        className={portalLinkClassName}
      >
        Choose from aircraft list
      </button>

      <div className={portalFieldGroupClassName}>
        <label htmlFor="custom_manufacturer" className={portalLabelClassName}>
          Manufacturer
        </label>
        <input
          id="custom_manufacturer"
          name="custom_manufacturer"
          type="text"
          value={values.manufacturer}
          onChange={(event) => updateField("manufacturer", event.target.value)}
          required
          className={portalFieldClassName}
        />
      </div>

      <div className={portalFieldGroupClassName}>
        <label htmlFor="custom_model" className={portalLabelClassName}>
          Model
        </label>
        <input
          id="custom_model"
          name="custom_model"
          type="text"
          value={values.model}
          onChange={(event) => updateField("model", event.target.value)}
          required
          className={portalFieldClassName}
        />
      </div>

      <div className={portalFieldGroupClassName}>
        <label htmlFor="custom_tail_number" className={portalLabelClassName}>
          Tail number
        </label>
        <input
          id="custom_tail_number"
          name="custom_tail_number"
          type="text"
          value={values.tailNumber}
          onChange={(event) => updateField("tailNumber", event.target.value)}
          required
          className={portalFieldClassName}
        />
      </div>

      <div className={portalFieldGroupClassName}>
        <label htmlFor="custom_seats" className={portalLabelClassName}>
          Seats
        </label>
        <input
          id="custom_seats"
          name="custom_seats"
          type="number"
          min={1}
          max={32767}
          value={values.seats}
          onChange={(event) => updateField("seats", event.target.value)}
          required
          className={portalFieldClassName}
        />
      </div>

      <div className={portalFieldGroupClassName}>
        <label htmlFor="custom_rnav_equipped" className={portalLabelClassName}>
          <input
            id="custom_rnav_equipped"
            name="custom_rnav_equipped"
            type="checkbox"
            checked={values.rnavEquipped}
            onChange={(event) => updateField("rnavEquipped", event.target.checked)}
            className="mr-2"
          />
          RNAV equipped
        </label>
      </div>

      <div className={portalFieldGroupClassName}>
        <label htmlFor="custom_icao_wtc" className={portalLabelClassName}>
          ICAO wake turbulence category
        </label>
        <select
          id="custom_icao_wtc"
          value={values.icaoWtc}
          onChange={(event) => updateField("icaoWtc", event.target.value)}
          required
          className={portalFieldClassName}
        >
          <option value="">Select category</option>
          {ICAO_WTC_VALUES.map((value) => (
            <option key={value} value={value}>
              {ICAO_WTC_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className={portalFieldGroupClassName}>
        <label htmlFor="custom_weight_class" className={portalLabelClassName}>
          FAA weight category
        </label>
        <select
          id="custom_weight_class"
          value={values.weightClass}
          onChange={(event) => updateField("weightClass", event.target.value)}
          required
          className={portalFieldClassName}
        >
          <option value="">Select category</option>
          {FAA_WEIGHT_CLASSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div className={portalFieldGroupClassName}>
        <label htmlFor="custom_wingspan_ft" className={portalLabelClassName}>
          Wingspan (ft)
        </label>
        <input
          id="custom_wingspan_ft"
          name="custom_wingspan_ft"
          type="number"
          min={0.01}
          step="0.01"
          value={values.wingspanFt}
          onChange={(event) => updateField("wingspanFt", event.target.value)}
          required
          className={portalFieldClassName}
        />
      </div>

      <div className={portalFieldGroupClassName}>
        <label htmlFor="custom_length_ft" className={portalLabelClassName}>
          Length (ft)
        </label>
        <input
          id="custom_length_ft"
          name="custom_length_ft"
          type="number"
          min={0.01}
          step="0.01"
          value={values.lengthFt}
          onChange={(event) => updateField("lengthFt", event.target.value)}
          required
          className={portalFieldClassName}
        />
      </div>

      <div className={portalFieldGroupClassName}>
        <label htmlFor="custom_aac" className={portalLabelClassName}>
          Aerodrome approach category
        </label>
        <select
          id="custom_aac"
          value={values.aac}
          onChange={(event) => updateField("aac", event.target.value)}
          required
          className={portalFieldClassName}
        >
          <option value="">Select category</option>
          {AAC_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div className={portalFieldGroupClassName}>
        <label htmlFor="custom_adg" className={portalLabelClassName}>
          Aircraft design group
        </label>
        <select
          id="custom_adg"
          value={values.adg}
          onChange={(event) => updateField("adg", event.target.value)}
          required
          className={portalFieldClassName}
        >
          <option value="">Select group</option>
          {ADG_VALUES.map((value) => (
            <option key={value} value={value}>
              {ADG_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
