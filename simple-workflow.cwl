#!/usr/bin/env cwl-runner
cwlVersion: v1.2
class: CommandLineTool
baseCommand: node
requirements:
  DockerRequirement:
    dockerPull: miguel76/lsq-clean:latest
    dockerOutputDirectory: /home/node/output
inputs:
  lsq_source:
    type: stdin
  execs_ns:
    type: string
    inputBinding:
      position: 1
  queries_csv_filename:
    type: string?
    inputBinding:
      prefix: --queries-csv
    # default: queries
  execs_csv_filename:
    type: string?
    inputBinding:
      prefix: --execs-csv
    # default: execs
  queries_rdf_filename:
    type: string?
    inputBinding:
      prefix: --queries-rdf
    # default: queries
  execs_rdf_filename:
    type: string?
    inputBinding:
      prefix: --execs-rdf
    # default: execs
outputs:
  queries_csv:
    type: File?
    outputBinding:
      glob: $(inputs.queries_csv_filename).csv
  execs_csv:
    type: File?
    outputBinding:
      glob: $(inputs.execs_csv_filename).csv
  queries_rdf:
    type: File?
    outputBinding:
      glob: $(inputs.queries_rdf_filename).nt.gz
  execs_rdf:
    type: File?
    outputBinding:
      glob: $(inputs.execs_rdf_filename).nt.gz