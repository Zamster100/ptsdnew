export interface GrokProfile {
  type: string
  note: string
}

export interface DiagnosisResult extends GrokProfile {
  id: number
  patientNo: string
  handle: string
  traumaIndex: number
}
