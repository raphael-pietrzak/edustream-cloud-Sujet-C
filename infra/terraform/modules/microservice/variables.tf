variable "name" { type = string }
variable "namespace" { type = string }
variable "image" { type = string }
variable "port" { type = number }
variable "replicas" {
  type    = number
  default = 1
}
variable "cpu_request" {
  type    = string
  default = "50m"
}
variable "cpu_limit" {
  type    = string
  default = "300m"
}
variable "memory_request" {
  type    = string
  default = "96Mi"
}
variable "memory_limit" {
  type    = string
  default = "256Mi"
}
variable "env" {
  type    = map(string)
  default = {}
}
variable "hpa_enabled" {
  type    = bool
  default = false
}
variable "hpa_min" {
  type    = number
  default = 1
}
variable "hpa_max" {
  type    = number
  default = 4
}
variable "hpa_cpu_target" {
  type    = number
  default = 60
}
