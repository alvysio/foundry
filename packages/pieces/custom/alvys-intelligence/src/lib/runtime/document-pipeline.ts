/**
 * Document pipeline helpers — Alvys-shaped post-processing of extracted
 * fields. Upstream workflows are provisioned per flow/step at runtime (see
 * `runtime/providers/bem.ts`); this module only handles splitting extractor
 * output into the canonical schema and tenant custom-references.
 */

type MergeResult = {
  canonical: Record<string, unknown>;
  customReferences: Record<string, unknown>;
};

type FieldSchema = Record<string, { type: string; description: string }>;

const COMMON_FIELDS: FieldSchema = {
  documentDate: { type: 'string', description: 'Primary date on the document, ISO 8601 if possible' },
  referenceNumbers: { type: 'string', description: 'Any other reference, confirmation, or tracking numbers found' },
};

/**
 * Alvys-shaped canonical extraction schema per document type. These seed the
 * output schema of the auto-provisioned extraction workflow so the extractor
 * returns the canonical fields in addition to tenant custom-references.
 */
const CANONICAL_FIELDS_BY_DOCTYPE: Readonly<Record<string, FieldSchema>> = {
  ratecon: {
    loadNumber: { type: 'string', description: 'Load, order, or shipment number' },
    brokerName: { type: 'string', description: 'Broker or billing party company name' },
    brokerMcNumber: { type: 'string', description: 'Broker MC number' },
    carrierName: { type: 'string', description: 'Carrier company name' },
    carrierMcNumber: { type: 'string', description: 'Carrier MC number' },
    totalRate: { type: 'number', description: 'Total agreed rate in dollars, numeric' },
    linehaulRate: { type: 'number', description: 'Linehaul portion of the rate in dollars, numeric' },
    fuelSurcharge: { type: 'number', description: 'Fuel surcharge in dollars, numeric' },
    pickupLocation: { type: 'string', description: 'Pickup / shipper name and address' },
    pickupDate: { type: 'string', description: 'Pickup date and appointment window' },
    deliveryLocation: { type: 'string', description: 'Delivery / consignee name and address' },
    deliveryDate: { type: 'string', description: 'Delivery date and appointment window' },
    equipment: { type: 'string', description: 'Equipment type required (e.g. 53ft dry van, reefer, flatbed)' },
    commodity: { type: 'string', description: 'Commodity description' },
    weight: { type: 'string', description: 'Shipment weight' },
    ...COMMON_FIELDS,
  },
  pod: {
    loadNumber: { type: 'string', description: 'Load, order, BOL, or PRO number the delivery belongs to' },
    consigneeName: { type: 'string', description: 'Receiver / consignee name' },
    deliveryDate: { type: 'string', description: 'Date and time goods were received' },
    receivedBy: { type: 'string', description: 'Name of the person who signed for the goods' },
    pieceCount: { type: 'string', description: 'Pieces / pallets delivered' },
    damageNoted: { type: 'string', description: 'Any damage, shortage, or exception noted' },
    ...COMMON_FIELDS,
  },
  bol: {
    bolNumber: { type: 'string', description: 'Bill of lading number' },
    shipperName: { type: 'string', description: 'Shipper name and address' },
    consigneeName: { type: 'string', description: 'Consignee name and address' },
    carrierName: { type: 'string', description: 'Carrier name' },
    proNumber: { type: 'string', description: 'PRO or tracking number' },
    commodity: { type: 'string', description: 'Commodity / freight description' },
    weight: { type: 'string', description: 'Total weight' },
    pieceCount: { type: 'string', description: 'Pieces / pallets / handling units' },
    hazmat: { type: 'string', description: 'Hazmat indication if present' },
    ...COMMON_FIELDS,
  },
  customer_invoice: {
    invoiceNumber: { type: 'string', description: 'Invoice number' },
    invoiceDate: { type: 'string', description: 'Invoice date' },
    billToName: { type: 'string', description: 'Bill-to customer name' },
    loadNumber: { type: 'string', description: 'Related load or order number' },
    totalAmount: { type: 'number', description: 'Invoice total in dollars, numeric' },
    dueDate: { type: 'string', description: 'Payment due date or terms' },
    lineItems: { type: 'string', description: 'Summary of charge line items' },
    ...COMMON_FIELDS,
  },
  carrier_invoice: {
    invoiceNumber: { type: 'string', description: 'Invoice number' },
    invoiceDate: { type: 'string', description: 'Invoice date' },
    carrierName: { type: 'string', description: 'Carrier issuing the invoice' },
    loadNumber: { type: 'string', description: 'Related load or order number' },
    totalAmount: { type: 'number', description: 'Invoice total in dollars, numeric' },
    ...COMMON_FIELDS,
  },
  coi: {
    insuredName: { type: 'string', description: 'Named insured company' },
    producerName: { type: 'string', description: 'Producer / agency name' },
    autoLiabilityLimit: { type: 'string', description: 'Automobile liability limit' },
    cargoLimit: { type: 'string', description: 'Motor truck cargo limit' },
    generalLiabilityLimit: { type: 'string', description: 'General liability limit' },
    policyNumbers: { type: 'string', description: 'Policy numbers listed' },
    effectiveDate: { type: 'string', description: 'Policy effective date' },
    expirationDate: { type: 'string', description: 'Policy expiration date' },
    certificateHolder: { type: 'string', description: 'Certificate holder name and address' },
    ...COMMON_FIELDS,
  },
  mvr: {
    driverName: { type: 'string', description: 'Driver full name' },
    licenseNumber: { type: 'string', description: 'Driver license number' },
    licenseState: { type: 'string', description: 'Issuing state' },
    licenseClass: { type: 'string', description: 'License class' },
    violations: { type: 'string', description: 'Violations / convictions listed' },
    status: { type: 'string', description: 'License status' },
    ...COMMON_FIELDS,
  },
  dac: {
    driverName: { type: 'string', description: 'Driver full name' },
    employmentHistory: { type: 'string', description: 'Employment history entries' },
    incidents: { type: 'string', description: 'Reported incidents or remarks' },
    ...COMMON_FIELDS,
  },
  ifta: {
    period: { type: 'string', description: 'Reporting quarter / period' },
    totalMiles: { type: 'string', description: 'Total miles by jurisdiction' },
    totalGallons: { type: 'string', description: 'Total fuel gallons by jurisdiction' },
    taxDue: { type: 'string', description: 'Tax due or credit' },
    ...COMMON_FIELDS,
  },
  lumper_receipt: {
    facilityName: { type: 'string', description: 'Facility / warehouse where lumper service occurred' },
    amount: { type: 'number', description: 'Lumper fee in dollars, numeric' },
    loadNumber: { type: 'string', description: 'Related load or PO number' },
    paymentMethod: { type: 'string', description: 'How the fee was paid (EFS / cash / check number)' },
    ...COMMON_FIELDS,
  },
  scale_ticket: {
    grossWeight: { type: 'string', description: 'Gross weight' },
    tareWeight: { type: 'string', description: 'Tare weight' },
    netWeight: { type: 'string', description: 'Net weight' },
    location: { type: 'string', description: 'Scale location' },
    ticketNumber: { type: 'string', description: 'Ticket number' },
    ...COMMON_FIELDS,
  },
  accessorial_receipt: {
    chargeType: { type: 'string', description: 'Accessorial type (detention, layover, tolls, etc.)' },
    amount: { type: 'number', description: 'Amount in dollars, numeric' },
    loadNumber: { type: 'string', description: 'Related load number' },
    ...COMMON_FIELDS,
  },
  edi_204_image: {
    shipmentId: { type: 'string', description: 'Shipment identification number' },
    customerName: { type: 'string', description: 'Tendering customer' },
    stops: { type: 'string', description: 'Stop sequence with locations and dates' },
    rate: { type: 'string', description: 'Offered rate if present' },
    ...COMMON_FIELDS,
  },
  other: {
    documentTitle: { type: 'string', description: 'Best-guess title of the document' },
    parties: { type: 'string', description: 'Companies or people involved' },
    amounts: { type: 'string', description: 'Any monetary amounts found' },
    ...COMMON_FIELDS,
  },
};

/**
 * Classification criteria per document type — descriptions carry the matching
 * signals the classifier needs (key phrases, fields present, layout traits),
 * not just the label.
 */
const CLASSIFICATION_CRITERIA: ReadonlyArray<{ name: string; description: string }> = [
  {
    name: 'pod',
    description:
      'Proof of Delivery: a signed delivery receipt confirming goods were received. Look for a consignee signature line that is SIGNED, "received by", delivery date stamps, piece counts, and notations of damage/shortage. Usually a signed copy of a BOL or delivery receipt — the signature/receipt acknowledgment is the distinguishing trait.',
  },
  {
    name: 'ratecon',
    description:
      'Rate Confirmation: an agreement between a broker and a carrier for one load. Look for "Rate Confirmation" or "Load Confirmation" titles, broker and carrier names with MC numbers, an agreed rate (linehaul, fuel surcharge, total), pickup and delivery stops with appointment windows, and carrier/broker signature lines. Distinguished from a BOL by the presence of negotiated rates.',
  },
  {
    name: 'bol',
    description:
      'Bill of Lading: shipping document listing freight tendered to a carrier. Look for "Bill of Lading" or "Straight Bill of Lading" titles, BOL number, shipper/consignee blocks, commodity descriptions with weights and handling units, freight class, and hazmat declarations. No negotiated rate amounts; unsigned consignee block (a signed one is a POD).',
  },
  {
    name: 'customer_invoice',
    description:
      'Customer (freight) Invoice: a bill issued TO a shipper/customer for transportation services. Look for "Invoice" title, invoice number/date, bill-to customer, related load number, itemized freight charges, total due, and remit-to details.',
  },
  {
    name: 'carrier_invoice',
    description:
      'Carrier Invoice: a bill issued BY a carrier (to a broker) for hauling a load. Look for carrier letterhead, invoice number, load/ratecon reference, linehaul amount, and frequently attached factoring/notice-of-assignment language.',
  },
  {
    name: 'coi',
    description:
      'Certificate of Insurance: ACORD-style certificate listing insurance coverages. Look for "Certificate of Liability Insurance" / ACORD 25 layout, producer/insured blocks, policy numbers, coverage limits (auto liability, motor truck cargo, general liability), effective/expiration dates, and certificate holder.',
  },
  {
    name: 'mvr',
    description:
      'Motor Vehicle Record: a state driving-history report for a driver. Look for license number, class, status, violation/conviction history with dates, and issuing-state formatting.',
  },
  {
    name: 'dac',
    description:
      'DAC / employment history report for a driver. Look for previous employer entries with dates, reason for leaving, rehire eligibility, and drug/alcohol testing history.',
  },
  {
    name: 'ifta',
    description:
      'IFTA fuel tax report. Look for quarterly reporting period, miles and fuel gallons broken down by state/province jurisdiction, and tax due/credit computations.',
  },
  {
    name: 'lumper_receipt',
    description:
      'Lumper Receipt: receipt for loading/unloading labor at a warehouse. Look for lumper service company name, facility, fee amount, and payment method (EFS/Comchek codes, cash, check).',
  },
  {
    name: 'scale_ticket',
    description:
      'Scale Ticket: a weigh ticket from a truck scale (e.g. CAT Scale). Look for gross/tare/net weights, scale location, ticket number, and weigh date/time.',
  },
  {
    name: 'accessorial_receipt',
    description:
      'Accessorial Receipt: receipt or proof for an extra charge — detention, layover, tolls, permits, washouts. Look for a single charge type with amount tied to a load.',
  },
  {
    name: 'edi_204_image',
    description:
      'EDI 204 Load Tender rendered as a document/image. Look for tender language ("must respond/accept by"), shipment ID, customer tendering the load, stop sequence, and EDI-style segment or reference codes.',
  },
];

export const documentPipeline = {
  canonicalFieldsFor(documentType: string): FieldSchema {
    return CANONICAL_FIELDS_BY_DOCTYPE[documentType] ?? CANONICAL_FIELDS_BY_DOCTYPE['other'];
  },

  classificationCriteria(): ReadonlyArray<{ name: string; description: string }> {
    return CLASSIFICATION_CRITERIA;
  },

  /**
   * Split the upstream-extracted field set into:
   *   - canonical: fields that match the doc-type's well-known schema.
   *   - customReferences: tenant-defined ad-hoc fields, projected by the
   *     keys present in the supplied `customReferenceSchema`.
   *
   * No knowledge of upstream field names beyond what was extracted. If a
   * tenant reference key matches a top-level field returned by the extractor,
   * it's hoisted into customReferences; otherwise the reference value is
   * `null` so downstream flows can still branch on the key's presence.
   */
  mergeWithCustomReferences({
    fields,
    customReferenceSchema,
  }: {
    fields: Record<string, unknown>;
    customReferenceSchema: Record<string, unknown>;
  }): MergeResult {
    const canonical: Record<string, unknown> = {};
    const customReferences: Record<string, unknown> = {};

    const refKeys = Object.keys(customReferenceSchema ?? {});
    const refKeySet = new Set(refKeys);

    for (const [k, v] of Object.entries(fields ?? {})) {
      if (refKeySet.has(k)) {
        customReferences[k] = v;
      } else {
        canonical[k] = v;
      }
    }

    for (const k of refKeys) {
      if (!(k in customReferences)) {
        customReferences[k] = null;
      }
    }

    return { canonical, customReferences };
  },
};
