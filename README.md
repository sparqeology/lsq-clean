# lsq-clean
A tool to clean and extract SPARQL logs information from dumps generated by the [Linked SPARQL Queries (LSQ) project](http://lsq.aksw.org/).
The RDF output of the tool applied to LSQ 2.0 is [publicly available](10.6084/m9.figshare.28151342).

The LSQ project collected logs from several SPARQL endpoints and mapped them to a [common RDF vocabulary](http://lsq.aksw.org/vocab) visually described [here](http://lsq.aksw.org/v2/concepts/data-model.html).
But due to [this bug](https://github.com/AKSW/LSQ/issues/40), the resulting RDF graph does not reflect the original data and some information is lost (namely specific information about each separate execution of a query).
Furthermore, LSQ files contain, along the basic information about query executions from the logs, derived information on query structure (representation in SPIN-SPARQL notation and triple patterns contained) and local re-execution of queries or part of them.
That information is potentially useful but takes a lot of space and can extracted/computed back from the basic log information.
This tool extracts the basic log information from LSQ files (N-Triples compressed with bz2), using an euristic (based on the order of the triples in the files) to recover as much as possible the information that would have been lost considering the files as RDF. The data is then exported both as RDF (N-Triples compressed with gzip) and as CSV files.

## Extracted Information

For each unique query the information items extracted are the following ones:
- ID of the query;
- full textual representation (SPARQL).

For each execution the information items are the following ones:
- ID of the query executed;
- timestamp of the log entry (should be the time when the query is received);
- hash of the host that sent the query to the endpoint (if available).

In RDF output files this information is represented according to the [LSQ vocabulary](http://lsq.aksw.org/vocab),
while for CSV output there are two kinds of files exported, one for unique queries and one for executions,
with columns corresponding with the information items described above.

## Cleaned LSQ 2.0

As stated above, the RDF output of the tool applied to LSQ 2.0 is [publicly available](10.6084/m9.figshare.28151342).
This probably all that you need to know: as LSQ 2.0 contains currently all the data that has been published by the LSQ project, you do not need to use the tool yourself, unless you are contributing to it or you use LSQ pipeline on your own data (which we do not suggest due to the aforementioned bug).

## Usage from Command Line (suggested for a single local source)
The only requirement is having [Docker](https://www.docker.com/) installed and running.

Pull image from Docker Hub

```shell
docker pull sparqeology/lsq-clean
```

Example usage:

```shell
docker run sparqeology/lsq-clean \
    --source data/input/bench-kegg-lsq2.nt.bz2 \
    --queries-csv data/output/bio2rdf-kegg_queries.csv \
    --execs-csv data/output/bio2rdf-kegg_execs.csv \
    --queries-rdf data/output/bio2rdf-kegg_queries.nt.gz \
    --execs-rdf data/output/bio2rdf-kegg_execs.nt.gz \
    --execs-ns http://lsq.aksw.org/sources/kegg/execs/
```

Get usage documentation

```shell
docker run sparqeology/lsq-clean --help
```

## Usage in a CWL pipeline (suggested for multiple sources)

In order to support more complex scenarios, some pipelines using the [Common Workflow Language (CWL)](https://www.commonwl.org/) are supplied.
You need [Docker](https://www.docker.com/) installed and running.

### Download CWL files

Download [the latest archive with CWL files](https://github.com/sparqeology/lsq-clean/releases/download/v1.0.0/lsq-clean-cwl.zip)

```shell
wget https://github.com/sparqeology/lsq-clean/releases/download/v1.0.0/lsq-clean-cwl.zip
```

Decompress the file and move inside the created directory (the following commands assume you are inside the directory).

```shell
unzip lsq-clean-cwl.zip
cd lsq-clean-cwl
```

### Install a CWL Engine

For the supplied pipelines you need a CWL engine supporting [CWL v1.2.0](https://www.commonwl.org/v1.2/), for example [cwltool](https://github.com/common-workflow-language/cwltool).

If you have not it installed globally, you can install cwltool locally with Python and PIP following the steps below.

Install virtualenv (if you don't already have it installed)

```shell
pip install virtualenv
```

Create a new virtual environment and install the requirements (including cwltool)

```shell
virtualenv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Run CWL Pipeline

To convert a single file you can use `simple-workflow.cwl`. 
You can find an example of input in `simple-input-example.yml`.

```shell
cwl-runner --outdir=data/lsq2-clean \
    simple-workflow.cwl simple-input-example.yml
```

To convert multiple files you can use `list-workflow.cwl`. 
You can find an example of input in `sample-files.yml`, featuring some files from the LSQ 2 dataset.

```shell
cwl-runner --outdir=data/lsq2-clean \
    filelist-workflow.cwl sample-files.yml
```

To convert multiple files under a common namespace (with a simpler input in respect to `list-workflow.cwl`) you can use `sources-workflow.cwl`. 
You can find examples of inputs in `sample-local-sources.yml` and `sample-remote-sources.yml`.

```shell
cwl-runner --outdir=data/lsq2-clean \
    sources-workflow.cwl sample-remote-sources.yml
```

To convert all LSQ2 you can use can call `sources-workflow.cwl` with `meta-lsq/lsq2-sources.yml` as input.

```shell
cwl-runner --outdir=data/lsq2-clean \
    sources-workflow.cwl meta-lsq/lsq2-sources.yml
```

## Contribute

The development repo is https://github.com/sparqeology/lsq-clean
The node module is under `nodejs/`
while the CWL code is under `cwl/`.
Pull requests are welcome.

## Deploy (for maintainers)

### Build and publish nodejs image

Move to nodejs package root

```shell
cd nodejs
```

Install nodejs dependencies

```shell
npm install
```

Publish new Docker image

```shell
source publishImage.sh
```

### Publish CWL zip

Generate zip with CWL files

```shell
cd cwl
git archive HEAD -o ~/lsq-clean-cwl.zip
```

Upload zip file as a new release