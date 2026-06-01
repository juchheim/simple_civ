export function BoardLighting() {
    return (
        <>
            <ambientLight intensity={0.82} />
            <hemisphereLight args={["#dbeafe", "#0f172a", 0.72]} />
            <directionalLight position={[8, 14, 10]} intensity={1.1} />
        </>
    );
}
