#!/usr/bin/env cwl-runner
cwlVersion: v1.2
class: CommandLineTool
baseCommand: node
requirements:
  DockerRequirement:
    dockerLoad: dist/docker_image.tar.gz
    dockerImageId: lsq_clean
    dockerOutputDirectory: /home/node/output
inputs:
  lsq_source:
    type: stdin
  execs_ns:
    type: string
    inputBinding:
      position: 1
outputs:
  queries_rdf:
    type: File
    outputBinding:
      glob: queries.nt.gz
  execs_rdf:
    type: File
    outputBinding:
      glob: execs.nt.gz